import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	StringSelectMenuBuilder,
	TextChannel,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { DeathCause } from "../../database/models/DeathModel";
import { DeathPatternModel, IDeathPattern } from "../../database/models/DeathPatternModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { Minecraft } from "../../structures/Minecraft";
import { escapeRegex } from "../common/regexUtils";
import { isMinecraftMob, MINECRAFT_MOBS } from "../minecraft/minecraftMobs";

export class DeathRegexLearner {
	private static pendingMessages = new Set<string>();

	/**
	 * Analyze potential death message and prompt admin / generate candidate regex
	 */
	public static async processUnknownDeathMessage(
		main: Minecraft,
		serverMsg: string,
		overrides?: { victim?: string; mob?: string; killer?: string; cause?: DeathCause }
	): Promise<IDeathPattern | null> {
		const cleanMsg = serverMsg.trim();
		if (
			cleanMsg.includes("[Bot Tip]") ||
			cleanMsg.startsWith("[BOT]") ||
			cleanMsg.startsWith("> [BOT]")
		) {
			return null;
		}

		const serverIp = main.config.connection.host;

		if (this.pendingMessages.has(`${serverIp}:${cleanMsg}`)) return null;
		this.pendingMessages.add(`${serverIp}:${cleanMsg}`);

		// Prevent duplicate triggers for 10 minutes
		setTimeout(() => this.pendingMessages.delete(`${serverIp}:${cleanMsg}`), 10 * 60 * 1000);

		// 1. Separate trailing weapon phrase (supports both bracketed "[sword of king]" and default multi-word "diamond sword")
		let detectedWeaponPhrase: string | null = null;
		let detectedWeaponKeyword: string | null = null;
		let detectedWeaponName: string | null = null;
		let baseMsg = cleanMsg;

		const weaponMatch = cleanMsg.match(/(?:\s+(cầm|sử\s+dụng|bằng|dùng|using|with|holding)\s+(\[[^\]]+\]|.+))$/i);
		if (weaponMatch) {
			detectedWeaponKeyword = weaponMatch[1];
			detectedWeaponName = weaponMatch[2].trim();
			detectedWeaponPhrase = weaponMatch[0];
			baseMsg = cleanMsg.slice(0, cleanMsg.length - detectedWeaponPhrase.length).trim();
		}

		// 2. Priority 1: Fetch current online players from Mineflayer bot and Redis cache
		const botPlayers = main.bot?.players ? Object.keys(main.bot.players) : [];
		const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);

		const onlinePlayerMap = new Map<string, string>();
		for (const p of [...botPlayers, ...onlinePlayers]) {
			if (p && p.trim().length >= 3) {
				const trimmed = p.trim();
				const lower = trimmed.toLowerCase();
				if (!onlinePlayerMap.has(lower)) {
					onlinePlayerMap.set(lower, trimmed);
				}
			}
		}

		const matchedPlayers: string[] = [];
		const matchedPlayersLower = new Set<string>();

		// Match online players found in baseMsg
		for (const [lower, originalName] of onlinePlayerMap.entries()) {
			const regex = new RegExp(`\\b${escapeRegex(lower)}\\b`, "i");
			if (regex.test(baseMsg) && !matchedPlayersLower.has(lower)) {
				matchedPlayersLower.add(lower);
				matchedPlayers.push(originalName);
			}
		}

		// 3. Scan baseMsg words for other potential Minecraft usernames (Priority 2: DB Fallback)
		const wordTokens = baseMsg.split(/\s+/);
		for (const token of wordTokens) {
			// If token contains non-ASCII characters (e.g. Vietnamese accents "tiêu", "diệt", "ngã"), ignore completely
			if (/[^\x00-\x7F]/.test(token)) {
				continue;
			}

			// Trim leading/trailing punctuation delimiters like <name>, [name], "name", name:
			const cleanToken = token.replace(/^[<(\[{:,"'!]+|[>)\]}:,"'!]+$/g, "");
			const lowerToken = cleanToken.toLowerCase();

			if (/^[a-zA-Z0-9_]{3,16}$/.test(cleanToken) && !isMinecraftMob(cleanToken)) {
				if (!matchedPlayersLower.has(lowerToken)) {
					let isServerPlayer = onlinePlayerMap.has(lowerToken);
					if (!isServerPlayer) {
						try {
							const existsInDb = await PlayerModel.exists({ server: serverIp, username: lowerToken });
							if (existsInDb) {
								isServerPlayer = true;
							}
						} catch {
							// Ignore DB error
						}
					}

					if (isServerPlayer || /^[a-zA-Z0-9_]{3,16}$/.test(cleanToken)) {
						matchedPlayersLower.add(lowerToken);
						matchedPlayers.push(cleanToken);
					}
				}
			}
		}

		// If an override victim is provided, ensure it's in matchedPlayers
		if (overrides?.victim && !matchedPlayersLower.has(overrides.victim.toLowerCase())) {
			matchedPlayers.unshift(overrides.victim);
			matchedPlayersLower.add(overrides.victim.toLowerCase());
		}

		// Keep only players actually occurring in baseMsg and sort by appearance order
		const validPlayers = matchedPlayers.filter((p) => baseMsg.toLowerCase().indexOf(p.toLowerCase()) >= 0);
		if (validPlayers.length === 0) {
			return null;
		}

		validPlayers.sort((a, b) => {
			return baseMsg.toLowerCase().indexOf(a.toLowerCase()) - baseMsg.toLowerCase().indexOf(b.toLowerCase());
		});

		// 4. Identify victim, killer, or mob
		const victim = overrides?.victim || validPlayers[0];
		let killer: string | null = overrides?.killer || (validPlayers.length > 1 ? validPlayers[1] : null);

		let detectedMob: string | null = overrides?.mob || null;
		if (!detectedMob) {
			for (const mobName of MINECRAFT_MOBS) {
				const mobRegex = new RegExp(`\\b${escapeRegex(mobName)}\\b`, "i");
				if (mobRegex.test(baseMsg)) {
					detectedMob = mobName;
					break;
				}
			}
		}

		// Detect Player vs Mob conflict
		let hasPlayerMobConflict = false;
		if (killer && isMinecraftMob(killer)) {
			hasPlayerMobConflict = true;
		} else if (validPlayers.length === 1 && detectedMob && onlinePlayerMap.has(detectedMob.toLowerCase())) {
			hasPlayerMobConflict = true;
			killer = onlinePlayerMap.get(detectedMob.toLowerCase()) || detectedMob;
		}

		let cause = overrides?.cause || DeathCause.UNKNOWN;

		if (cause === DeathCause.UNKNOWN) {
			if (hasPlayerMobConflict) {
				cause = DeathCause.PVP;
			} else if (killer && !isMinecraftMob(killer) && /^[a-zA-Z0-9_]{3,16}$/.test(killer)) {
				cause = DeathCause.PVP;
			} else {
				cause = DeathCause.DEATH;
			}
		}

		// 5. Auto-generate candidate regex
		let weaponRegexClause = "";
		if (detectedWeaponPhrase && detectedWeaponKeyword) {
			weaponRegexClause = `(?:\\s+(?:cầm|sử\\s+dụng|bằng|dùng|using|with|holding)\\s+\\[?(?<weapon>.+?)\\]?)?`;
		}

		let generatedPattern = escapeRegex(baseMsg);
		generatedPattern = generatedPattern.replace(new RegExp(escapeRegex(victim), "gi"), "(?<victim>[a-zA-Z0-9_]{3,16})");

		if (killer && killer.toLowerCase() !== victim.toLowerCase()) {
			generatedPattern = generatedPattern.replace(new RegExp(escapeRegex(killer), "gi"), "(?<killer>[a-zA-Z0-9_]{3,16})");
		} else if (detectedMob) {
			generatedPattern = generatedPattern.replace(new RegExp(escapeRegex(detectedMob), "gi"), "(?<mob>.+?)");
		}

		// Normalize spaces to \\s+
		generatedPattern = generatedPattern.replace(/\\\s+/g, "\\s+").replace(/\s+/g, "\\s+");
		generatedPattern = `^${generatedPattern}${weaponRegexClause}$`;

		try {
			const patternName = `auto_learned_${serverIp.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
			const newPattern = await DeathPatternModel.create({
				serverScope: serverIp,
				name: patternName,
				pattern: generatedPattern,
				cause,
				priority: 50,
				enabled: false,
				sampleMessage: cleanMsg,
			});

			main.client.logger.info(
				`[DeathRegexLearner] New candidate pattern created for [${serverIp}]: "${generatedPattern}" (Victim: "${victim}", Killer: ${killer ? `"${killer}"` : "null"}, Cause: ${cause})`
			);

			const verifyChannelId =
				main.config.deathMessageChannelId ||
				main.config.livechat.deathMessageChannelId ||
				(main.client.config as any).deathVerificationChannel;

			const targetChannel =
				main.deathChannel ||
				(verifyChannelId ? main.client.channels.cache.get(verifyChannelId) as TextChannel : null) ||
				(main.channel as TextChannel);

			if (targetChannel) {
				const row = new ActionRowBuilder<ButtonBuilder>();

				if (hasPlayerMobConflict) {
					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_resolve_pvp_${newPattern._id}`)
							.setLabel(`Là PvP (Player "${killer}")`)
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`death_resolve_mob_${newPattern._id}`)
							.setLabel(`Là Tử vong (Quái vật "${killer || detectedMob}")`)
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`death_swap_${newPattern._id}`)
							.setLabel("Đổi Vị trí")
							.setStyle(ButtonStyle.Secondary),
						new ButtonBuilder()
							.setCustomId(`death_dismiss_${newPattern._id}`)
							.setLabel("Bỏ qua")
							.setStyle(ButtonStyle.Danger)
					);
				} else {
					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_approve_${newPattern._id}`)
							.setLabel("Xác nhận")
							.setStyle(ButtonStyle.Success)
					);

					if (killer || detectedMob) {
						row.addComponents(
							new ButtonBuilder()
								.setCustomId(`death_swap_${newPattern._id}`)
								.setLabel("Đổi Vị trí")
								.setStyle(ButtonStyle.Secondary)
						);
					}

					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_edit_${newPattern._id}`)
							.setLabel("Sửa Regex")
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`death_dismiss_${newPattern._id}`)
							.setLabel("Bỏ qua")
							.setStyle(ButtonStyle.Danger)
					);
				}

				const causeSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`select_death_cause_${newPattern._id}`)
						.setPlaceholder("Hoặc chọn trực tiếp nguyên nhân tử vong...")
						.addOptions(
							{ label: "PvP (Player vs Player - Tính KD)", value: "PVP", description: "Người chơi tiêu diệt lẫn nhau" },
							{ label: "Tử vong (Môi trường / Quái vật / Rơi ngã)", value: "DEATH", description: "Chết do môi trường, quái vật, ngã, tự sát" },
							{ label: "Chưa rõ (Vẫn tính là 1 lần tử vong)", value: "UNKNOWN", description: "Nguyên nhân chưa rõ, vẫn tính 1 lần chết" }
						)
				);

				const title = hasPlayerMobConflict
					? "**Xung đột: Trùng Tên Người Chơi & Mob**"
					: "**Yêu cầu xác minh Death Message mới**";

				const desc = hasPlayerMobConflict
					? `Tên \`${killer || detectedMob}\` vừa là **Tên người chơi online** vừa là **Tên quái vật (Mob)** trong Minecraft. Vui lòng xác nhận chính xác nguyên nhân bên dưới.`
					: "Bot phát hiện một câu thông báo tử vong chưa có trong danh mục mẫu. Vui lòng xác minh để hoàn tất học mẫu regex.";

				const victimHead = `https://mc-heads.net/avatar/${victim}/64.png`;

				const section = new SectionBuilder()
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`${title}\n${desc}\n\n` +
							`- **Server:** \`${serverIp}\` | **Nguyên nhân:** \`${cause}\`\n` +
							`- **Nạn nhân:** \`${victim}\`${killer ? ` | **Kẻ hạ gục:** \`${killer}\`` : ""}${detectedMob && !killer ? ` | **Quái vật:** \`${detectedMob}\`` : ""}` +
							(detectedWeaponName ? `\n- **Vũ khí:** \`${detectedWeaponName}\`` : "")
						)
					)
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(victimHead).setDescription(`Victim: ${victim}`));

				const container = new ContainerBuilder()
					.setAccentColor(hasPlayerMobConflict ? 0xff4500 : 0xffa500)
					.addSectionComponents(section)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`**Tin nhắn gốc:**\n\`\`\`${cleanMsg}\`\`\`\n` +
							`**Candidate Regex:**\n\`\`\`regex\n${generatedPattern}\`\`\`\n` +
							`*Pattern ID: ${newPattern._id} | Chờ Admin duyệt*`
						)
					)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addActionRowComponents(row)
					.addActionRowComponents(causeSelectRow);

				try {
					const sentMsg = await targetChannel.send({
						components: [container],
						flags: MessageFlags.IsComponentsV2,
					});
					if (sentMsg) {
						newPattern.verificationChannelId = sentMsg.channelId;
						newPattern.verificationMessageId = sentMsg.id;
						await newPattern.save();
					}
				} catch (err) {
					main.client.logger.error(`[DeathRegexLearner] Failed to send verification message: ${err}`);
				}
			}

			return newPattern;
		} catch (err) {
			main.client.logger.error(`[DeathRegexLearner] Failed to create pattern: ${err}`);
			return null;
		}
	}
}
