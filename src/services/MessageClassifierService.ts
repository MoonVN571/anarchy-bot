import { Minecraft } from "../structures";
import { DeathParserService } from "./DeathParserService";
import { SystemPatternService } from "./SystemPatternService";
import { DeathRegexLearner } from "../utils/deathRegexLearner";
import { RedisManager } from "../redis/RedisManager";
import {
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";

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

		// 3. Check for keywords suggesting Death -> Trigger DeathRegexLearner directly
		if (DeathParserService.hasDeathKeywords(cleanText)) {
			await DeathRegexLearner.processUnknownDeathMessage(bot, cleanText);
			return;
		}

		// 4. Check if message is a standard join/leave/queue/auth or chat (skip prompting)
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

		// 5. Unrecognized message -> Prompt Admin for Classification
		await this.promptAdminClassification(bot, serverIp, cleanText);
	}

	/**
	 * Send classification prompt with interactive Discord Components V2 Container
	 */
	public static async promptAdminClassification(
		main: Minecraft,
		serverIp: string,
		cleanText: string
	): Promise<void> {
		const key = `${serverIp}:${cleanText}`;
		if (this.pendingPrompts.has(key)) return;
		this.pendingPrompts.add(key);

		// Prevent duplicate spam for 10 minutes
		setTimeout(() => this.pendingPrompts.delete(key), 10 * 60 * 1000);

		// Identify mentioned online players to suggest victim/killer
		const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);
		const botPlayers = main.bot?.players ? Object.keys(main.bot.players) : [];
		const allKnown = Array.from(new Set([...onlinePlayers, ...botPlayers]));

		const foundPlayers = allKnown.filter(p => {
			if (!p || p.length < 3) return false;
			return new RegExp(`\\b${p}\\b`, "i").test(cleanText);
		});

		const likelyDeath = foundPlayers.length > 0 || DeathParserService.hasDeathKeywords(cleanText);
		const promptId = Buffer.from(`${Date.now()}_${Math.floor(Math.random() * 1000)}`).toString("base64url");

		const verifyChannelId =
			process.env.DEATH_VERIFY_CHANNEL_ID ||
			(main.client.config as any).deathVerificationChannel;

		const targetChannel =
			(verifyChannelId ? main.client.channels.cache.get(verifyChannelId) : null) as TextChannel ||
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

		const prediction = likelyDeath
			? `Nghi vấn Death Message (Phát hiện: ${foundPlayers.map(p => `\`${p}\``).join(", ") || "Từ khóa tử vong"})`
			: "Nghi vấn System / Thông báo Server";

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
