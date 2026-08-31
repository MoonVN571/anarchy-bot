import { ContainerBuilder, TextDisplayBuilder } from "discord.js";
import { DeathCause, DeathModel, IDeath } from "../../database/models/DeathModel";
import { DeathPatternModel, IDeathPattern } from "../../database/models/DeathPatternModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { Discord } from "../../structures/Discord";
import { Minecraft } from "../../structures/Minecraft";
import { defaultDeathPatterns, DeathRegexLearner } from "../../utils";

export interface ParsedDeath {
	victim: string;
	killer?: string | null;
	mob?: string | null;
	weapon?: string | null;
	cause: DeathCause;
	rawMessage: string;
}

export class DeathParserService {
	private static isSeeded = false;

	/**
	 * Seed initial default patterns into MongoDB if empty
	 */
	public static async seedDefaultPatterns(): Promise<void> {
		if (this.isSeeded) return;

		try {
			const count = await DeathPatternModel.countDocuments();
			if (count === 0) {
				await DeathPatternModel.insertMany(defaultDeathPatterns);
			}
			this.isSeeded = true;
		} catch {
			// Ignore if MongoDB not yet ready
		}
	}

	private static memoryCache: Map<string, { regex: RegExp; patternDoc: IDeathPattern }[]> = new Map();

	/**
	 * Invalidate memory cache for a server
	 */
	public static invalidateCache(server: string): void {
		this.memoryCache.delete(server.toLowerCase());
		this.memoryCache.delete("global");
	}

	/**
	 * Synchronously check if a text matches any active death pattern (DB/Redis cache + defaults)
	 */
	public static isDeathMessageSync(server: string, text: string): boolean {
		if (!text) return false;
		const clean = text.trim();
		const s = server.toLowerCase();

		const cached = this.memoryCache.get(s) || this.memoryCache.get("global");
		if (cached && cached.length > 0) {
			for (const { regex } of cached) {
				if (regex.test(clean)) return true;
			}
		}

		for (const p of defaultDeathPatterns) {
			try {
				if (new RegExp(p.pattern, "i").test(clean)) return true;
			} catch {
				// Ignore
			}
		}
		return false;
	}

	/**
	 * Synchronously extract victim, killer, mob, weapon from death message
	 */
	public static extractDeathInfoSync(server: string, text: string): {
		victim: string;
		killer?: string | null;
		mob?: string | null;
		weapon?: string | null;
		cause: DeathCause;
	} | null {
		if (!text) return null;
		const clean = text.trim();
		const s = server.toLowerCase();

		const cached = this.memoryCache.get(s) || this.memoryCache.get("global");
		if (cached && cached.length > 0) {
			for (const { regex, patternDoc } of cached) {
				const m = clean.match(regex);
				if (m && m.groups && m.groups.victim) {
					return {
						victim: m.groups.victim.trim(),
						killer: m.groups.killer ? m.groups.killer.trim() : null,
						mob: m.groups.mob ? m.groups.mob.trim() : null,
						weapon: m.groups.weapon ? m.groups.weapon.trim() : null,
						cause: patternDoc.cause || DeathCause.UNKNOWN,
					};
				}
			}
		}

		for (const p of defaultDeathPatterns) {
			try {
				const m = clean.match(new RegExp(p.pattern, "i"));
				if (m && m.groups && m.groups.victim) {
					return {
						victim: m.groups.victim.trim(),
						killer: m.groups.killer ? m.groups.killer.trim() : null,
						mob: m.groups.mob ? m.groups.mob.trim() : null,
						weapon: m.groups.weapon ? m.groups.weapon.trim() : null,
						cause: p.cause || DeathCause.UNKNOWN,
					};
				}
			} catch {
				// Ignore
			}
		}

		return null;
	}

	/**
	 * Get compiled regex patterns for a server (scoped + global)
	 */
	public static async getPatternsForServer(server: string): Promise<{ regex: RegExp; patternDoc: IDeathPattern }[]> {
		await this.seedDefaultPatterns();
		const s = server.toLowerCase();

		if (this.memoryCache.has(s) && this.memoryCache.get(s)!.length > 0) {
			return this.memoryCache.get(s)!;
		}

		// 1. Try Redis cache
		let rawPatterns = await RedisManager.getCachedDeathPatterns(server);

		// 2. Fallback to MongoDB query
		if (!rawPatterns || rawPatterns.length === 0) {
			rawPatterns = await DeathPatternModel.find({
				$or: [{ serverScope: "global" }, { serverScope: server }],
				enabled: true,
			}).sort({ priority: -1, createdAt: -1 }).lean();

			if (rawPatterns && rawPatterns.length > 0) {
				await RedisManager.cacheDeathPatterns(server, rawPatterns as any);
			}
		}

		// Compile regex patterns
		const compiled: { regex: RegExp; patternDoc: IDeathPattern }[] = [];
		for (const p of rawPatterns || []) {
			try {
				const regex = new RegExp(p.pattern, "i");
				compiled.push({ regex, patternDoc: p as IDeathPattern });
			} catch {
				// Skip invalid regex
			}
		}

		this.memoryCache.set(s, compiled);
		return compiled;
	}

	/**
	 * Parse server message to check if it's a death event
	 */
	public static async handleDeathMessage(
		main: Minecraft,
		serverMsg: string
	): Promise<ParsedDeath | null> {
		if (!serverMsg) return null;

		const cleanMsg = serverMsg.trim();
		const serverIp = main.config.connection.host;

		const patterns = await this.getPatternsForServer(serverIp);

		// 1. Try matching with active patterns
		for (const { regex, patternDoc } of patterns) {
			const match = cleanMsg.match(regex);
			if (match && match.groups && match.groups.victim) {
				const victim = match.groups.victim.trim();
				const killer = match.groups.killer ? match.groups.killer.trim() : null;
				const mob = match.groups.mob ? match.groups.mob.trim() : null;
				const weapon = match.groups.weapon ? match.groups.weapon.trim() : null;
				const cause = patternDoc.cause || DeathCause.UNKNOWN;

				const parsed: ParsedDeath = {
					victim,
					killer,
					mob,
					weapon,
					cause,
					rawMessage: cleanMsg,
				};

				main.client.logger.debug(
					"Death/KD",
					`[${serverIp}] Matched pattern "${patternDoc.name}" -> Victim: "${victim}", Killer: ${killer ? `"${killer}"` : "null"}, Mob: ${mob ? `"${mob}"` : "null"}, Cause: ${cause}`
				);

				await this.recordDeathStats(main, serverIp, parsed);
				return parsed;
			}
		}

		// 2. Check if message has death keywords but didn't match -> Learn dynamically
		if (this.hasDeathKeywords(cleanMsg)) {
			main.client.logger.debug("Death/KD", `[${serverIp}] Unrecognized death keyword in: "${cleanMsg}". Triggering learner.`);
			DeathRegexLearner.processUnknownDeathMessage(main, cleanMsg).catch(() => { });
		}

		return null;
	}

	/**
	 * Record death and update player KDA in Database & Redis
	 */
	private static async recordDeathStats(main: Minecraft, server: string, parsed: ParsedDeath): Promise<IDeath | null> {
		return this.recordDeathStatsDirect(server, parsed, main?.client?.logger);
	}

	/**
	 * Direct recording of death stats without needing a Minecraft instance
	 */
	public static async recordDeathStatsDirect(server: string, parsed: ParsedDeath, logger?: any): Promise<IDeath | null> {
		try {
			// 1. Save death log
			const deathRecord = await DeathModel.create({
				server,
				victim: parsed.victim.toLowerCase(),
				victimDisplayName: parsed.victim,
				killer: parsed.killer ? parsed.killer.toLowerCase() : null,
				killerDisplayName: parsed.killer || null,
				mob: parsed.mob,
				weapon: parsed.weapon,
				cause: parsed.cause,
				rawMessage: parsed.rawMessage,
				timestamp: new Date(),
			});

			// 2. Update victim stats
			const victimLower = parsed.victim.toLowerCase();
			await RedisManager.incrementLeaderboard(server, "deaths", victimLower, 1);

			const victimInc: any = { deaths: 1 };
			if (parsed.cause === DeathCause.SUICIDE) victimInc.suicides = 1;
			if (parsed.cause === DeathCause.MOB) victimInc.mobDeaths = 1;

			const victimDoc = await PlayerModel.findOneAndUpdate(
				{ server, username: victimLower },
				{
					$setOnInsert: {
						server,
						username: victimLower,
						displayName: parsed.victim,
						firstSeen: new Date(),
						playtime: 0,
						kills: 0,
						messageCount: 0,
					},
					$set: {
						lastSeen: new Date(),
						currentKillstreak: 0,
					},
					$inc: victimInc,
				},
				{ upsert: true, returnDocument: 'after' }
			);

			if (victimDoc) {
				const kd = victimDoc.deaths > 0 ? parseFloat((victimDoc.kills / victimDoc.deaths).toFixed(2)) : victimDoc.kills;
				await PlayerModel.updateOne({ _id: victimDoc._id }, { $set: { kdRatio: kd } });
				await RedisManager.setLeaderboardScore(server, "kd", victimLower, kd);
				if (logger) logger.debug("Death/KD", `[${server}] Victim "${parsed.victim}" stats updated: Deaths=${victimDoc.deaths}, K/D=${kd}`);
			}

			// 3. Update killer stats (PvP)
			if (parsed.killer) {
				const killerLower = parsed.killer.toLowerCase();
				await RedisManager.incrementLeaderboard(server, "kills", killerLower, 1);

				const killerDoc = await PlayerModel.findOneAndUpdate(
					{ server, username: killerLower },
					{
						$setOnInsert: {
							server,
							username: killerLower,
							displayName: parsed.killer,
							firstSeen: new Date(),
							playtime: 0,
							deaths: 0,
							messageCount: 0,
						},
						$set: {
							lastSeen: new Date(),
						},
						$inc: {
							kills: 1,
							currentKillstreak: 1,
						},
					},
					{ upsert: true, returnDocument: 'after' }
				);

				if (killerDoc) {
					const newStreak = killerDoc.currentKillstreak || 1;
					const maxStreak = Math.max(killerDoc.highestKillstreak || 0, newStreak);
					const kd = killerDoc.deaths > 0 ? parseFloat((killerDoc.kills / killerDoc.deaths).toFixed(2)) : killerDoc.kills;

					await PlayerModel.updateOne(
						{ _id: killerDoc._id },
						{
							$set: {
								highestKillstreak: maxStreak,
								kdRatio: kd,
							},
						}
					);
					await RedisManager.setLeaderboardScore(server, "kd", killerLower, kd);
					if (logger) logger.debug("Death/KD", `[${server}] Killer "${parsed.killer}" stats updated: Kills=${killerDoc.kills}, Streak=${newStreak}, K/D=${kd}`);
				}
			}

			return deathRecord;
		} catch {
			return null;
		}
	}

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
		this.invalidateCache(serverScope);
		await RedisManager.invalidateDeathPatterns(serverScope);

		// 1. Retroactively fix stats for the approved pattern's sample message if custom values were provided
		if (approvedPattern.sampleMessage && customVictim) {
			await this.retroactivelyFixDeathStats(
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
						await this.recordDeathStatsDirect(serverScope, {
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
							await this.recordDeathStatsDirect(pending.serverScope, parsed, client.logger);
						}
					}

					// Update old Discord verification message if IDs exist
					if (pending.verificationChannelId && pending.verificationMessageId) {
						try {
							const channel = client.channels.cache.get(pending.verificationChannelId) as any;
							if (channel && channel.isTextBased()) {
								const msg = await channel.messages.fetch(pending.verificationMessageId).catch(() => null);
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
			client.logger.error(`[DeathParserService] Error retroactively applying pattern: ${err}`);
		}
	}

	/**
	 * Retroactively fix and recalculate player stats if an admin corrected victim or killer
	 */
	public static async retroactivelyFixDeathStats(
		server: string,
		sampleMessage: string,
		correctedVictim: string,
		correctedKiller: string | null,
		correctedMob: string | null,
		correctedCause: DeathCause
	): Promise<void> {
		if (!sampleMessage) return;

		try {
			// Find existing death log recorded for this message
			const existingDeath = await DeathModel.findOne({
				server,
				rawMessage: sampleMessage,
			}).sort({ timestamp: -1 });

			const victimLower = correctedVictim.toLowerCase().trim();
			const killerLower = correctedKiller ? correctedKiller.toLowerCase().trim() : null;

			if (existingDeath) {
				const oldVictimLower = existingDeath.victim.toLowerCase();
				const oldKillerLower = existingDeath.killer ? existingDeath.killer.toLowerCase() : null;

				// A. Fix Victim if changed
				if (oldVictimLower !== victimLower) {
					// Revert death from old victim
					const oldVictimDoc = await PlayerModel.findOneAndUpdate(
						{ server, username: oldVictimLower },
						{ $inc: { deaths: -1 } },
						{ returnDocument: "after" }
					);
					if (oldVictimDoc) {
						const safeDeaths = Math.max(0, oldVictimDoc.deaths);
						const kd = safeDeaths > 0 ? parseFloat((oldVictimDoc.kills / safeDeaths).toFixed(2)) : oldVictimDoc.kills;
						await PlayerModel.updateOne({ _id: oldVictimDoc._id }, { $set: { deaths: safeDeaths, kdRatio: kd } });
					}

					// Add death to corrected victim
					const newVictimDoc = await PlayerModel.findOneAndUpdate(
						{ server, username: victimLower },
						{
							$setOnInsert: {
								server,
								username: victimLower,
								displayName: correctedVictim,
								firstSeen: new Date(),
								playtime: 0,
								kills: 0,
								messageCount: 0,
							},
							$set: { lastSeen: new Date() },
							$inc: { deaths: 1 },
						},
						{ upsert: true, returnDocument: "after" }
					);
					if (newVictimDoc) {
						const kd = newVictimDoc.deaths > 0 ? parseFloat((newVictimDoc.kills / newVictimDoc.deaths).toFixed(2)) : newVictimDoc.kills;
						await PlayerModel.updateOne({ _id: newVictimDoc._id }, { $set: { kdRatio: kd } });
					}
				}

				// B. Fix Killer if changed
				if (oldKillerLower !== killerLower) {
					if (oldKillerLower) {
						// Revert kill from old killer
						const oldKillerDoc = await PlayerModel.findOneAndUpdate(
							{ server, username: oldKillerLower },
							{ $inc: { kills: -1 } },
							{ returnDocument: "after" }
						);
						if (oldKillerDoc) {
							const safeKills = Math.max(0, oldKillerDoc.kills);
							const kd = oldKillerDoc.deaths > 0 ? parseFloat((safeKills / oldKillerDoc.deaths).toFixed(2)) : safeKills;
							await PlayerModel.updateOne({ _id: oldKillerDoc._id }, { $set: { kills: safeKills, kdRatio: kd } });
						}
					}

					if (killerLower) {
						// Add kill to corrected killer
						const newKillerDoc = await PlayerModel.findOneAndUpdate(
							{ server, username: killerLower },
							{
								$setOnInsert: {
									server,
									username: killerLower,
									displayName: correctedKiller!,
									firstSeen: new Date(),
									playtime: 0,
									deaths: 0,
									messageCount: 0,
								},
								$set: { lastSeen: new Date() },
								$inc: { kills: 1 },
							},
							{ upsert: true, returnDocument: "after" }
						);
						if (newKillerDoc) {
							const kd = newKillerDoc.deaths > 0 ? parseFloat((newKillerDoc.kills / newKillerDoc.deaths).toFixed(2)) : newKillerDoc.kills;
							await PlayerModel.updateOne({ _id: newKillerDoc._id }, { $set: { kdRatio: kd } });
						}
					}
				}

				// Update the death log
				existingDeath.victim = victimLower;
				existingDeath.victimDisplayName = correctedVictim;
				existingDeath.killer = killerLower;
				existingDeath.killerDisplayName = correctedKiller || null;
				existingDeath.mob = correctedMob || null;
				existingDeath.cause = correctedCause;
				await existingDeath.save();
			}
		} catch (err) {
			// Catch error safely
		}
	}

	/**
	 * Keywords indicating a potential death message
	 */
	public static hasDeathKeywords(msg: string): boolean {
		const lower = msg.toLowerCase();
		return (
			lower.includes("đã bị") ||
			lower.includes("ăn sống") ||
			lower.includes("tiễn lên bảng") ||
			lower.includes("hạ gục") ||
			lower.includes("thử nghiệm trọng lực") ||
			lower.includes("quên mang dù") ||
			lower.includes("không thể bay") ||
			lower.includes("hư không") ||
			lower.includes("thế giới") ||
			lower.includes("tự sát") ||
			lower.includes("chết đuối") ||
			lower.includes("nổ tung") ||
			lower.includes("was slain by") ||
			lower.includes("was shot by") ||
			lower.includes("was blown up") ||
			lower.includes("was killed by") ||
			lower.includes("hit the ground") ||
			lower.includes("fell into the void") ||
			lower.includes("burned to death") ||
			lower.includes("drowned")
		);
	}
}
