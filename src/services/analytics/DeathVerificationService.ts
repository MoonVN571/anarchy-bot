import { ContainerBuilder, TextDisplayBuilder, GuildTextBasedChannel } from "discord.js";
import { DeathCause, DeathModel } from "../../database/models/DeathModel";
import { DeathPatternModel, IDeathPattern } from "../../database/models/DeathPatternModel";
import { RedisManager } from "../../redis/RedisManager";
import { Discord } from "../../structures/Discord";
import { DeathParserService } from "./DeathParserService";
import { DeathStatsService, ParsedDeath } from "./DeathStatsService";

export class DeathVerificationService {
	/**
	 * Centralized method triggered when a pattern is approved, created or edited:
	 * 1. Invalidate caches (Memory & Redis).
	 * 2. Retroactively fix stats if custom victim/killer provided.
	 * 3. Scan and batch process all matching pending death patterns retroactively.
	 * 4. Update their Discord verification messages and remove buttons.
	 */
	public static async onPatternApproved(
		client: Discord,
		approvedPattern: IDeathPattern,
		approverName: string,
		customVictim?: string | null,
		customKiller?: string | null
	): Promise<void> {
		const serverScope = approvedPattern.serverScope;
		DeathParserService.invalidateCache(serverScope);
		await RedisManager.invalidateDeathPatterns(serverScope);

		// 1. Retroactively fix stats for the approved pattern's sample message if custom values were provided
		if (approvedPattern.sampleMessage && customVictim) {
			await DeathStatsService.retroactivelyFixDeathStats(
				serverScope,
				approvedPattern.sampleMessage,
				customVictim,
				approvedPattern.cause === DeathCause.PVP ? (customKiller || null) : null,
				approvedPattern.cause === DeathCause.MOB ? (customKiller || null) : null,
				approvedPattern.cause
			);
		} else if (approvedPattern.sampleMessage) {
			// Ensure stats recorded for sample message if not already recorded
			try {
				const existing = await DeathModel.findOne({
					server: serverScope,
					rawMessage: approvedPattern.sampleMessage,
				});
				if (!existing) {
					const match = approvedPattern.sampleMessage.match(new RegExp(approvedPattern.pattern, "i"));
					if (match && match.groups && match.groups.victim) {
						await DeathStatsService.recordDeathStatsDirect(serverScope, {
							victim: match.groups.victim.trim(),
							killer: match.groups.killer ? match.groups.killer.trim() : null,
							mob: match.groups.mob ? match.groups.mob.trim() : null,
							weapon: match.groups.weapon ? match.groups.weapon.trim() : null,
							cause: approvedPattern.cause,
							rawMessage: approvedPattern.sampleMessage,
						}, client.logger);
					}
				}
			} catch {
				// Ignore
			}
		}

		// 2. Scan and batch resolve other pending patterns matching this regex
		try {
			const compiledRegex = new RegExp(approvedPattern.pattern, "i");
			const pendingPatterns = await DeathPatternModel.find({
				_id: { $ne: approvedPattern._id },
				$or: [{ serverScope: "global" }, { serverScope: serverScope }],
				enabled: false,
			});

			for (const pending of pendingPatterns) {
				if (pending.sampleMessage && compiledRegex.test(pending.sampleMessage)) {
					const match = pending.sampleMessage.match(compiledRegex);
					if (match && match.groups && match.groups.victim) {
						const victim = match.groups.victim.trim();
						const killer = match.groups.killer ? match.groups.killer.trim() : null;
						const mob = match.groups.mob ? match.groups.mob.trim() : null;
						const weapon = match.groups.weapon ? match.groups.weapon.trim() : null;

						const parsed: ParsedDeath = {
							victim,
							killer,
							mob,
							weapon,
							cause: approvedPattern.cause,
							rawMessage: pending.sampleMessage,
						};

						// Record death stats if not already recorded
						const existing = await DeathModel.findOne({
							server: pending.serverScope,
							rawMessage: pending.sampleMessage,
						});

						if (!existing) {
							await DeathStatsService.recordDeathStatsDirect(pending.serverScope, parsed, client.logger);
						}
					}

					// Update old Discord verification message if IDs exist
					if (pending.verificationChannelId && pending.verificationMessageId) {
						try {
							const channel = client.channels.cache.get(pending.verificationChannelId);
							if (channel && channel.isTextBased()) {
								const textChannel = channel as GuildTextBasedChannel;
								const msg = await textChannel.messages.fetch(pending.verificationMessageId).catch(() => null);
								if (msg) {
									const container = new ContainerBuilder()
										.setAccentColor(0x2ea711)
										.addTextDisplayComponents(
											new TextDisplayBuilder().setContent(
												`**Death Message Đã Được Tự Động Xác Minh**\n\n` +
												`- **Server:** \`${pending.serverScope}\` | **Nguyên nhân:** \`${approvedPattern.cause}\`\n` +
												`- **Pattern:** \`${approvedPattern.name}\`\n\n` +
												`**Tin nhắn gốc:**\n\`\`\`\n${pending.sampleMessage}\n\`\`\`\n` +
												`*Tự động đồng bộ theo mẫu đã duyệt bởi @${approverName}*`
											)
										);
									await msg.edit({ components: [container] }).catch(() => { });
								}
							}
						} catch {
							// Ignore discord message edit error
						}
					}

					// Delete resolved duplicate pattern
					await DeathPatternModel.deleteOne({ _id: pending._id });
				}
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			client.logger.error(`[DeathVerificationService] Error retroactively applying pattern: ${errorMsg}`);
		}
	}

	/**
	 * Re-verify all death patterns and death logs stored in Database against latest regex patterns
	 */
	public static async reverifyAllDeathsInDb(serverFilter?: string): Promise<{
		totalPatterns: number;
		verifiedPatterns: number;
		patternIssues: { id: string; name: string; issue: string }[];
		totalDeaths: number;
		matchedDeaths: number;
		updatedDeaths: number;
		unmatchedDeaths: number;
	}> {
		// Invalidate memory and Redis caches
		DeathParserService.invalidateCache("global");
		if (serverFilter) DeathParserService.invalidateCache(serverFilter);

		// Preload merged patterns
		await DeathParserService.getPatternsForServer(serverFilter || "global");

		// 1. Re-verify DeathPatternModel
		const patternQuery = serverFilter ? { $or: [{ serverScope: "global" }, { serverScope: serverFilter }] } : {};
		const allPatterns = await DeathPatternModel.find(patternQuery);
		let verifiedPatterns = 0;
		const patternIssues: { id: string; name: string; issue: string }[] = [];

		for (const p of allPatterns) {
			try {
				const reg = new RegExp(p.pattern, "i");
				if (p.sampleMessage) {
					const m = p.sampleMessage.match(reg);
					if (m && m.groups && m.groups.victim) {
						verifiedPatterns++;
					} else {
						patternIssues.push({
							id: String(p._id),
							name: p.name,
							issue: `Sample message "${p.sampleMessage}" does not match regex "${p.pattern}"`,
						});
					}
				} else {
					verifiedPatterns++;
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				patternIssues.push({
					id: String(p._id),
					name: p.name,
					issue: `Invalid regex pattern: ${msg}`,
				});
			}
		}

		// 2. Re-verify DeathModel (Historical death messages in DB)
		const deathQuery = serverFilter ? { server: serverFilter } : {};
		const allDeaths = await DeathModel.find(deathQuery);

		let matchedDeaths = 0;
		let updatedDeaths = 0;
		let unmatchedDeaths = 0;

		for (const death of allDeaths) {
			const server = death.server || "global";
			const raw = death.rawMessage;
			if (!raw) {
				unmatchedDeaths++;
				continue;
			}

			const info = DeathParserService.extractDeathInfoSync(server, raw);
			if (info) {
				matchedDeaths++;
				const victimLower = info.victim.toLowerCase();
				const killerLower = info.killer ? info.killer.toLowerCase() : null;

				const hasChanged =
					death.victim !== victimLower ||
					death.cause !== info.cause ||
					(death.killer || null) !== killerLower ||
					(death.mob || null) !== (info.mob || null) ||
					(death.weapon || null) !== (info.weapon || null);

				if (hasChanged) {
					death.victim = victimLower;
					death.victimDisplayName = info.victim;
					death.killer = killerLower;
					death.killerDisplayName = info.killer || null;
					death.mob = info.mob || null;
					death.weapon = info.weapon || null;
					death.cause = info.cause;
					await death.save();
					updatedDeaths++;
				}
			} else {
				unmatchedDeaths++;
			}
		}

		// Refresh caches for all servers
		DeathParserService.clearMemoryCache();
		await RedisManager.invalidateDeathPatterns("global");
		if (serverFilter) {
			await RedisManager.invalidateDeathPatterns(serverFilter);
		}

		return {
			totalPatterns: allPatterns.length,
			verifiedPatterns,
			patternIssues,
			totalDeaths: allDeaths.length,
			matchedDeaths,
			updatedDeaths,
			unmatchedDeaths,
		};
	}
}
