import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextChannel,
	TextDisplayBuilder,
} from "discord.js";
import { DeathCause } from "../../database/models/DeathModel";
import { RedisManager } from "../../redis/RedisManager";
import { Minecraft } from "../../structures";
import { DeathRegexLearner, escapeRegex } from "../../utils";
import { MINECRAFT_MOBS } from "../../utils/minecraft/minecraftMobs";
import { DeathParserService } from "../analytics/DeathParserService";
import { SystemPatternService } from "../analytics/SystemPatternService";

export class MessageClassifierService {
	private static pendingPrompts = new Set<string>();

	/**
	 * Main entry point: Inspects non-player messages to either route or prompt for classification
	 */
	public static async classifyAndProcess(
		bot: Minecraft,
		cleanText: string,
		fullMsg: string,
		parsed: any
	): Promise<void> {
		const serverIp = bot.config.connection.host;

		// 0. Guard against Bot messages, tips, and broadcasts
		if (
			parsed.type === "botChat" ||
			cleanText.includes("[Bot Tip]") ||
			cleanText.startsWith("[BOT]") ||
			cleanText.startsWith("> [BOT]") ||
			(bot.bot?.username && cleanText.toLowerCase().includes(bot.bot.username.toLowerCase() + ":"))
		) {
			bot.client.logger.debug("Classifier", `[${serverIp}] Skipped bot/tip message: "${cleanText}"`);
			return;
		}

		// 1. Check if it's an existing System message
		const isSystem = await SystemPatternService.matchSystemMessage(serverIp, cleanText);
		if (isSystem) {
			bot.client.logger.debug("Classifier", `[${serverIp}] System message identified: "${cleanText}"`);
			return;
		}

		// 2. Check if it's an existing Death message
		const deathResult = await DeathParserService.handleDeathMessage(bot, cleanText);
		if (deathResult) {
			return;
		}

		// 3. Check if message is a standard join/leave/queue/auth or chat (skip prompting)
		if (
			parsed.type === "join" ||
			parsed.type === "quit" ||
			parsed.type === "queue" ||
			parsed.type === "achievement" ||
			parsed.type === "whisper" ||
			parsed.type === "chat" ||
			parsed.type === "highlightChat" ||
			parsed.type === "botChat" ||
			cleanText.length < 4 ||
			cleanText.toLowerCase().includes("/login") ||
			cleanText.toLowerCase().includes("/register") ||
			cleanText.toLowerCase().includes("/pin")
		) {
			return;
		}

		// 5. Check online players with case-insensitive deduplication
		const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);
		const botPlayers = bot.bot?.players ? Object.keys(bot.bot.players) : [];
		const playerMap = new Map<string, string>();

		for (const p of [...onlinePlayers, ...botPlayers]) {
			if (p && p.trim().length >= 3) {
				const trimmed = p.trim();
				const lower = trimmed.toLowerCase();
				if (!playerMap.has(lower)) {
					playerMap.set(lower, trimmed);
				}
			}
		}

		const foundPlayers: string[] = [];
		const foundPlayersLower = new Set<string>();

		for (const [lower, originalName] of playerMap.entries()) {
			const regex = new RegExp(`\\b${escapeRegex(lower)}\\b`, "i");
			if (regex.test(cleanText) && !foundPlayersLower.has(lower)) {
				foundPlayersLower.add(lower);
				foundPlayers.push(originalName);
			}
		}

		// Check for Minecraft Mob names in the text
		let detectedMob: string | null = null;
		for (const mobName of MINECRAFT_MOBS) {
			const mobRegex = new RegExp(`\\b${escapeRegex(mobName)}\\b`, "i");
			if (mobRegex.test(cleanText)) {
				detectedMob = mobName;
				break;
			}
		}

		// Special Rule A: 2 or more players detected in server -> Candidate for PvP Death pattern
		if (foundPlayers.length >= 2) {
			bot.client.logger.debug(
				"Classifier",
				`[${serverIp}] 2 Players (${foundPlayers.slice(0, 2).map(p => `"${p}"`).join(", ")}) identified -> Auto-learning PvP Death pattern for Admin verification.`
			);
			await DeathRegexLearner.processUnknownDeathMessage(bot, cleanText);
			return;
		}

		// Special Rule B: Exactly 1 Player + Mob detected (and Mob is NOT an online player's name)
		if (foundPlayers.length === 1 && detectedMob && !playerMap.has(detectedMob.toLowerCase())) {
			bot.client.logger.debug(
				"Classifier",
				`[${serverIp}] 1 Player ("${foundPlayers[0]}") + Mob ("${detectedMob}") identified -> Auto-learning MOB Death pattern.`
			);
			await DeathRegexLearner.processUnknownDeathMessage(bot, cleanText, {
				victim: foundPlayers[0],
				mob: detectedMob,
				cause: DeathCause.DEATH,
			});
			return;
		}

		// 6. Unrecognized message -> Prompt Admin for Classification
		await this.promptAdminClassification(bot, serverIp, cleanText, foundPlayers, detectedMob, playerMap);
	}

	/**
	 * Send classification prompt with interactive Discord Components V2 Container
	 */
	public static async promptAdminClassification(
		main: Minecraft,
		serverIp: string,
		cleanText: string,
		foundPlayers?: string[],
		detectedMob?: string | null,
		playerMap?: Map<string, string>
	): Promise<void> {
		const key = `${serverIp}:${cleanText}`;
		if (this.pendingPrompts.has(key)) return;
		this.pendingPrompts.add(key);

		// Prevent duplicate spam for 10 minutes
		setTimeout(() => this.pendingPrompts.delete(key), 10 * 60 * 1000);

		// If foundPlayers was not passed, compute it
		let players = foundPlayers;
		if (!players) {
			const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);
			const botPlayers = main.bot?.players ? Object.keys(main.bot.players) : [];
			const pMap = new Map<string, string>();

			for (const p of [...onlinePlayers, ...botPlayers]) {
				if (p && p.trim().length >= 3) {
					const trimmed = p.trim();
					const lower = trimmed.toLowerCase();
					if (!pMap.has(lower)) {
						pMap.set(lower, trimmed);
					}
				}
			}

			players = [];
			const seen = new Set<string>();
			for (const [lower, originalName] of pMap.entries()) {
				const regex = new RegExp(`\\b${escapeRegex(lower)}\\b`, "i");
				if (regex.test(cleanText) && !seen.has(lower)) {
					seen.add(lower);
					players.push(originalName);
				}
			}
		}

		const hasMobConflict = detectedMob && playerMap ? playerMap.has(detectedMob.toLowerCase()) : false;
		const likelyDeath = players.length > 0;
		const promptId = Buffer.from(`${Date.now()}_${Math.floor(Math.random() * 1000)}`).toString("base64url");

		const verifyChannelId =
			main.config.deathVerifyChannelId ||
			main.config.livechat.deathVerifyChannelId ||
			main.config.deathMessageChannelId ||
			(main.client.config as any).deathVerificationChannel;

		const targetChannel =
			main.deathVerifyChannel ||
			(verifyChannelId ? main.client.channels.cache.get(verifyChannelId) as TextChannel : null) ||
			main.deathChannel ||
			(main.channel as TextChannel);

		if (!targetChannel) return;

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			new ButtonBuilder()
				.setCustomId(`classify_system_${promptId}`)
				.setLabel("Duyệt là System")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId(`classify_death_${promptId}`)
				.setLabel("Duyệt là Death")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`classify_dismiss_${promptId}`)
				.setLabel("Bỏ qua")
				.setStyle(ButtonStyle.Secondary)
		);

		let prediction = "Nghi vấn System / Thông báo Server";
		if (hasMobConflict) {
			prediction = `Nghi vấn Death Message (Xung đột: Player & Mob cùng tên \`${detectedMob}\`)`;
		} else if (likelyDeath) {
			prediction = `Nghi vấn Death Message (Phát hiện: ${players.map(p => `\`${p}\``).join(", ") || "Từ khóa tử vong"})`;
		}

		const container = new ContainerBuilder()
			.setAccentColor(likelyDeath ? 0xffa500 : 0x3498db)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					"**Yêu Cầu Phân Loại Tin Nhắn Mới**\n" +
					"Bot nhận được một tin nhắn hệ thống/server chưa rõ loại. Vui lòng duyệt xem đây là **Thông báo Hệ thống (System)** hay **Thông báo Tử vong (Death)**.\n\n" +
					`- **Máy chủ:** \`${serverIp}\`\n` +
					`- **Dự đoán sơ bộ:** ${prediction}`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Nội dung tin nhắn:**\n\`\`\`${cleanText}\`\`\`\n` +
					`*ID: ${promptId} | Chọn một trong các nút bên dưới*`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addActionRowComponents(row);

		targetChannel.send({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		}).catch((err) => {
			main.client.logger.error(`[MessageClassifier] Failed to send classification prompt: ${err}`);
		});
	}
}
