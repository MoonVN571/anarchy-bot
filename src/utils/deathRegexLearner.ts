import { Minecraft } from "../structures/Minecraft";
import { DeathPatternModel, IDeathPattern } from "../database/models/DeathPatternModel";
import { DeathCause } from "../database/models/DeathModel";
import { RedisManager } from "../redis/RedisManager";
import { isMinecraftMob, MINECRAFT_MOBS } from "./minecraftMobs";
import {
	EmbedBuilder,
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";

export class DeathRegexLearner {
	private static pendingMessages = new Set<string>();

	/**
	 * Analyze potential death message and prompt admin / generate candidate regex
	 */
	public static async processUnknownDeathMessage(
		main: Minecraft,
		serverMsg: string
	): Promise<IDeathPattern | null> {
		const cleanMsg = serverMsg.trim();
		const serverIp = main.config.connection.host;

		if (this.pendingMessages.has(`${serverIp}:${cleanMsg}`)) return null;
		this.pendingMessages.add(`${serverIp}:${cleanMsg}`);

		// Prevent memory leak on pending set
		setTimeout(() => this.pendingMessages.delete(`${serverIp}:${cleanMsg}`), 10 * 60 * 1000);

		// 1. Get online players to identify victim/killer in text
		const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);
		const botPlayers = main.bot?.players ? Object.keys(main.bot.players) : [];
		const allKnownPlayers = Array.from(new Set([...onlinePlayers, ...botPlayers]));

		// Find players mentioned in the message
		const foundPlayers = allKnownPlayers.filter(p => {
			if (!p || p.length < 3) return false;
			const regex = new RegExp(`\\b${p}\\b`, "i");
			return regex.test(cleanMsg);
		});

		if (foundPlayers.length === 0) {
			return null;
		}

		const victim = foundPlayers[0];
		let killer: string | null = foundPlayers.length > 1 ? foundPlayers[1] : null;
		let detectedMob: string | null = null;
		let hasPlayerMobConflict = false;

		// Check if message mentions any known mob
		for (const mobName of MINECRAFT_MOBS) {
			const mobRegex = new RegExp(`\\b${mobName}\\b`, "i");
			if (mobRegex.test(cleanMsg)) {
				detectedMob = mobName;
				break;
			}
		}

		// Conflict check: killer is both an online player and a known mob name (e.g. player named "Zombie" or "Alex")
		if (killer && isMinecraftMob(killer)) {
			hasPlayerMobConflict = true;
		}

		// 2. Generate candidate regex pattern
		let generatedPattern = this.escapeRegex(cleanMsg);
		generatedPattern = generatedPattern.replace(
			new RegExp(this.escapeRegex(victim), "gi"),
			"(?<victim>[a-zA-Z0-9_]{3,16})"
		);

		let cause = DeathCause.UNKNOWN;

		if (hasPlayerMobConflict) {
			// Ambiguous: could be PvP or Mob
			generatedPattern = generatedPattern.replace(
				new RegExp(this.escapeRegex(killer!), "gi"),
				"(?<killer>[a-zA-Z0-9_]{3,16})"
			);
			cause = DeathCause.UNKNOWN;
		} else if (killer) {
			generatedPattern = generatedPattern.replace(
				new RegExp(this.escapeRegex(killer), "gi"),
				"(?<killer>[a-zA-Z0-9_]{3,16})"
			);
			cause = DeathCause.PVP;
		} else if (detectedMob) {
			generatedPattern = generatedPattern.replace(
				new RegExp(this.escapeRegex(detectedMob), "gi"),
				"(?<mob>.+?)"
			);
			cause = DeathCause.MOB;
		} else {
			const lower = cleanMsg.toLowerCase();
			if (lower.includes("rơi") || lower.includes("fall") || lower.includes("bay") || lower.includes("dù")) {
				cause = DeathCause.FALL;
			} else if (lower.includes("void") || lower.includes("hư không") || lower.includes("thế giới")) {
				cause = DeathCause.VOID;
			} else if (lower.includes("dung nham") || lower.includes("lava")) {
				cause = DeathCause.LAVA;
			} else if (lower.includes("đuối") || lower.includes("drown")) {
				cause = DeathCause.DROWN;
			} else if (lower.includes("tự sát") || lower.includes("suicide")) {
				cause = DeathCause.SUICIDE;
			}
		}

		generatedPattern = `^${generatedPattern}$`;
		const patternName = `auto_${serverIp.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;

		// 3. Save candidate pattern into MongoDB
		try {
			const newPattern = await DeathPatternModel.create({
				serverScope: serverIp,
				name: patternName,
				pattern: generatedPattern,
				cause,
				priority: 50,
				enabled: true,
				sampleMessage: cleanMsg,
				confirmedBy: null,
			});

			await RedisManager.invalidateDeathPatterns(serverIp);
			main.client.logger.info(
				`[DeathRegexLearner] Created candidate death pattern for ${serverIp}: "${generatedPattern}" (Cause: ${cause}${hasPlayerMobConflict ? ", CONFLICT DETECTED" : ""})`
			);

			// 4. Send interactive verification message to dedicated channel
			const verifyChannelId =
				process.env.DEATH_VERIFY_CHANNEL_ID ||
				(main.client.config as any).deathVerificationChannel;

			const targetChannel =
				(verifyChannelId ? main.client.channels.cache.get(verifyChannelId) : null) as TextChannel ||
				(main.channel as TextChannel);

			if (targetChannel) {
				const embed = new EmbedBuilder()
					.setTitle(
						hasPlayerMobConflict
							? "Xung đột: Trùng Tên Người Chơi & Mob"
							: "Yêu cầu xác minh Death Message mới"
					)
					.setColor(hasPlayerMobConflict ? 0xff4500 : 0xffa500)
					.setDescription(
						hasPlayerMobConflict
							? `Tên \`${killer}\` vừa là **Tên người chơi online** vừa là **Tên quái vật (Mob)** trong Minecraft. Vui lòng xác nhận chính xác nguyên nhân bên dưới.`
							: "Bot phát hiện một câu thông báo tử vong chưa có trong danh mục mẫu. Vui lòng xác minh để hoàn tất học mẫu regex."
					)
					.addFields(
						{ name: "Server", value: `\`${serverIp}\``, inline: true },
						{ name: "Nguyên nhân (Cause)", value: `\`${cause}\``, inline: true },
						{ name: "Nạn nhân (Victim)", value: `\`${victim}\``, inline: true },
						...(killer ? [{ name: "Kẻ hạ gục", value: `\`${killer}\``, inline: true }] : []),
						...(detectedMob && !killer ? [{ name: "Quái vật (Mob)", value: `\`${detectedMob}\``, inline: true }] : []),
						{ name: "Tin nhắn gốc", value: `\`\`\`${cleanMsg}\`\`\`` },
						{ name: "Candidate Regex", value: `\`\`\`regex\n${generatedPattern}\`\`\`` }
					)
					.setFooter({ text: `Pattern ID: ${newPattern._id} | Chờ Admin duyệt` })
					.setTimestamp();

				const row = new ActionRowBuilder<ButtonBuilder>();

				if (hasPlayerMobConflict) {
					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_resolve_pvp_${newPattern._id}`)
							.setLabel(`Là PvP (Player "${killer}")`)
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`death_resolve_mob_${newPattern._id}`)
							.setLabel(`Là Mob (Quái vật "${killer}")`)
							.setStyle(ButtonStyle.Primary),
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
							.setStyle(ButtonStyle.Success),
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

				targetChannel.send({ embeds: [embed], components: [row] }).catch((err) => {
					main.client.logger.error(`[DeathRegexLearner] Failed to send verification message: ${err}`);
				});
			}

			return newPattern;
		} catch (err) {
			main.client.logger.error(`[DeathRegexLearner] Failed to create pattern: ${err}`);
			return null;
		}
	}

	private static escapeRegex(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}

