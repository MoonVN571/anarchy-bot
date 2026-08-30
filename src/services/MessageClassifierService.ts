import { Minecraft } from "../structures/Minecraft";
import { MessageType, ChatParser } from "../utils/chatParser";
import { DeathParserService } from "./DeathParserService";
import { SystemPatternService } from "./SystemPatternService";
import { RedisManager } from "../redis/RedisManager";
import {
	EmbedBuilder,
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} from "discord.js";

export enum ClassifiedCategory {
	Chat = "CHAT",
	Join = "JOIN",
	Leave = "LEAVE",
	Death = "DEATH",
	System = "SYSTEM",
	Unclassified = "UNCLASSIFIED",
}

export class MessageClassifierService {
	private static pendingPrompts = new Set<string>();

	/**
	 * Process and classify incoming Minecraft message
	 */
	public static async classifyAndProcess(
		main: Minecraft,
		rawText: string,
		fullMsg: string,
		parsedChat: any
	): Promise<ClassifiedCategory> {
		const cleanText = (rawText || fullMsg || "").trim();
		const serverIp = main.config.connection.host;

		if (!cleanText) return ClassifiedCategory.Unclassified;

		// 1. Normal Player Chat Message
		if (parsedChat && parsedChat.username && parsedChat.type === MessageType.Chat) {
			return ClassifiedCategory.Chat;
		}

		// 2. Player Join Message
		if (ChatParser.isJoinMessage(cleanText)) {
			const joinMatch = cleanText.match(
				/(?:>>\s*)?\[\+\]\s*([a-zA-Z0-9_]{3,16})|([a-zA-Z0-9_]{3,16})\s+(?:joined the game|đã tham gia)/i
			);
			const joinedUser = joinMatch ? joinMatch[1] || joinMatch[2] : null;
			if (joinedUser) {
				main.playtimeTracker?.handlePlayerJoin(joinedUser);
			}
			return ClassifiedCategory.Join;
		}

		// 3. Player Leave Message
		if (ChatParser.isLeaveMessage(cleanText)) {
			const leaveMatch = cleanText.match(
				/(?:>>\s*)?\[\-\]\s*([a-zA-Z0-9_]{3,16})|([a-zA-Z0-9_]{3,16})\s+(?:left the game|đã rời khỏi|đã rời đi)/i
			);
			const leftUser = leaveMatch ? leaveMatch[1] || leaveMatch[2] : null;
			if (leftUser) {
				main.playtimeTracker?.handlePlayerLeave(leftUser);
			}
			return ClassifiedCategory.Leave;
		}

		// 4. Check Known Death Patterns
		const deathResult = await DeathParserService.handleDeathMessage(main, cleanText);
		if (deathResult) {
			return ClassifiedCategory.Death;
		}

		// 5. Check Known System Patterns
		const systemMatch = await SystemPatternService.matchSystemMessage(serverIp, cleanText);
		if (systemMatch) {
			main.client.logger.debug("System", `[${serverIp}] Matched system pattern "${systemMatch.name}": "${cleanText}"`);
			return ClassifiedCategory.System;
		}

		// 6. Ambiguous / Unclassified Non-Player Message -> Prompt Admin for manual classification
		this.promptManualClassification(main, serverIp, cleanText).catch(() => {});
		return ClassifiedCategory.Unclassified;
	}

	/**
	 * Send an interactive Discord prompt asking Admin to classify the message as System or Death
	 */
	private static async promptManualClassification(
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

		const embed = new EmbedBuilder()
			.setTitle("Yêu Cầu Phân Loại Tin Nhắn Mới")
			.setColor(likelyDeath ? 0xffa500 : 0x3498db)
			.setDescription(
				"Bot nhận được một tin nhắn hệ thống/server chưa rõ loại. Vui lòng duyệt xem đây là **Thông báo Hệ thống (System)** hay **Thông báo Tử vong (Death)**."
			)
			.addFields(
				{ name: "Máy chủ", value: `\`${serverIp}\``, inline: true },
				{
					name: "Dự đoán sơ bộ",
					value: likelyDeath
						? `Nghi vấn Death Message (Phát hiện: ${foundPlayers.map(p => `\`${p}\``).join(", ") || "Từ khóa tử vong"})`
						: "Nghi vấn System / Thông báo Server",
					inline: true,
				},
				{ name: "Nội dung tin nhắn", value: `\`\`\`${cleanText}\`\`\`` }
			)
			.setFooter({ text: `ID: ${promptId} | Chọn một trong các nút bên dưới` })
			.setTimestamp();

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

		targetChannel.send({ embeds: [embed], components: [row] }).catch((err) => {
			main.client.logger.error(`[MessageClassifier] Failed to send classification prompt: ${err}`);
		});
	}
}
