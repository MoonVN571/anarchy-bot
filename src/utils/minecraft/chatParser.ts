import { DeathParserService, SystemPatternService } from "../../services";
import { Minecraft } from "../../structures";
import {
	defaultReplyColor,
	MINECRAFT_COLOR_MAP,
	MinecraftFormattedSegment,
	ChatJsonComponent,
	cleanMinecraftText,
	parseMinecraftFormattedSegments,
	escapeDiscordFormat,
	extractJsonText,
} from "./minecraftColors";
import { normalizeUuid, resolvePlayerByUuid, ResolvedPlayerInfo } from "./playerResolver";
import {
	isWhisperMsg,
	extractWhisperInfo,
	isAchievementMsg,
	extractAchievementUsername,
	extractJoinUsername,
	extractLeaveUsername,
	isJoinMessage,
	isLeaveMessage,
	isQueueMessage,
	WhisperInfo,
	JoinLeaveInfo,
} from "./chatExtractors";

export {
	defaultReplyColor,
	MINECRAFT_COLOR_MAP,
	MinecraftFormattedSegment,
	ChatJsonComponent,
	cleanMinecraftText,
	parseMinecraftFormattedSegments,
	escapeDiscordFormat,
	extractJsonText,
	normalizeUuid,
	resolvePlayerByUuid,
	ResolvedPlayerInfo,
	isWhisperMsg,
	extractWhisperInfo,
	isAchievementMsg,
	extractAchievementUsername,
	extractJoinUsername,
	extractLeaveUsername,
	isJoinMessage,
	isLeaveMessage,
	isQueueMessage,
	WhisperInfo,
	JoinLeaveInfo,
};

export enum MessageType {
	Chat = "chat",
	BotChat = "botChat",
	HighlightChat = "highlightChat",
	Whisper = "whisper",
	Server = "server",
	Queue = "queue",
	Dead = "dead",
	Achievement = "achievement",
	Join = "join",
	Quit = "quit",
}

export const messageColors: Record<MessageType, number> = {
	chat: 0x979797, // Xám: Chat người chơi
	highlightChat: 0x2ea711, // Xanh lá: Greentext (>...)
	botChat: 0x5865f2, // Blurple: Bot chat
	whisper: 0xfd00ff, // Hồng tím (Magenta): Thì thầm (Whisper / Msg)
	server: 0x3498db, // Xanh lam (Sky Blue): Tin nhắn hệ thống / Server broadcast
	queue: 0xf1c40f, // Vàng (Gold): Hàng đợi (Queue position)
	dead: 0xdb2d2d, // Đỏ thẫm (Crimson): Thông báo tử vong (Death / Kill)
	achievement: 0x9b59b6, // Tím (Purple): Thành tựu (Achievement / Advancement)
	join: 0x2ecc71, // Xanh lá tươi (Emerald): Người chơi vào server [+]
	quit: 0xe67e22, // Cam ấm (Carrot Orange): Người chơi rời server [-]
};

export interface QueueEventData {
	position: number;
	maxQueue?: number;
	estimatedWaitTime?: string;
	serverHost: string;
}

export interface ServerBroadcastData {
	title: string;
	content: string;
	serverHost: string;
}

export interface AdvancementEventData {
	username: string;
	advancementTitle: string;
	advancementType: "advancement" | "challenge" | "goal";
	rawText: string;
}

export interface ParsedChatMessage {
	type: MessageType;
	formattedMsg: string;
	rawText: string;
	username: string | null;
	targetUser?: string | null;
	victim?: string | null;
	killer?: string | null;
	mob?: string | null;
	weapon?: string | null;
	avatarUrl?: string;
	rank: string | null;
	message: string;
}

export class ChatParser {
	// Re-export delegates for complete backwards compatibility
	public static cleanMinecraftText = cleanMinecraftText;
	public static parseMinecraftFormattedSegments = parseMinecraftFormattedSegments;
	public static escapeDiscordFormat = escapeDiscordFormat;
	public static extractJsonText = extractJsonText;
	public static normalizeUuid = normalizeUuid;
	public static resolvePlayerByUuid = resolvePlayerByUuid;
	public static isWhisperMsg = isWhisperMsg;
	public static extractWhisperInfo = extractWhisperInfo;
	public static isAchievementMsg = isAchievementMsg;
	public static extractAchievementUsername = extractAchievementUsername;
	public static extractJoinUsername = extractJoinUsername;
	public static extractLeaveUsername = extractLeaveUsername;
	public static isJoinMessage = isJoinMessage;
	public static isLeaveMessage = isLeaveMessage;
	public static isQueueMessage = isQueueMessage;

	/**
	 * Parse chat message from string and optional jsonMsg/sender UUID
	 */
	public static parse(
		main: Minecraft,
		serverMsg: string,
		jsonMsg?: ChatJsonComponent | string | null,
		senderUuid?: string
	): ParsedChatMessage | null {
		const rawJson = typeof jsonMsg === "object" && jsonMsg !== null ? (jsonMsg.json || jsonMsg) : null;
		const fullText = serverMsg || extractJsonText(rawJson) || (typeof jsonMsg === "string" ? jsonMsg : "");
		if (!fullText) return null;

		const cleanText = cleanMinecraftText(fullText);

		// 1. Try structured extraction from jsonMsg and sender UUID
		let structured = this.extractFromJson(rawJson, main, cleanText, senderUuid || rawJson?.sender);

		// 2. Fallback to regex parsing on clean text
		if (!structured || !structured.username) {
			structured = this.parseUserMessage(cleanText);
		}

		// 3. Format message according to classification
		return this.formatParsedMessage(main, cleanText, structured, rawJson);
	}

	private static extractFromJson(
		json: ChatJsonComponent | null,
		bot: Minecraft,
		cleanText: string,
		senderUuid?: string
	): { rank: string | null; username: string | null; message: string } | null {
		// Sender UUID resolution from online players cache
		if (senderUuid && bot.bot) {
			const player = resolvePlayerByUuid(bot, senderUuid);
			if (player && player.username) {
				let msg = cleanText;
				const userPrefixRegex = new RegExp(`^(?:\\[[^\\]]+\\]\\s*)?[<\\(\\[]?${player.username}[>\\)\\]]?\\s*[:»>]?\\s*`, "i");
				if (userPrefixRegex.test(cleanText)) {
					msg = cleanText.replace(userPrefixRegex, "").trim();
				}
				return {
					rank: null,
					username: player.username,
					message: msg,
				};
			}
		}

		if (!json) return null;

		// Vanilla translate keys: chat.type.text, chat.type.announcement, etc.
		if (json.translate && json.translate.startsWith("chat.type.") && Array.isArray(json.with) && json.with.length >= 2) {
			const rawSender = cleanMinecraftText(extractJsonText(json.with[0]));
			const cleanSender = rawSender.replace(/^[<\[\(](.*)[>\]\)]$/, "$1").trim();
			const msg = cleanMinecraftText(extractJsonText(json.with[1])) || cleanText;
			if (cleanSender) {
				return {
					rank: null,
					username: cleanSender,
					message: msg,
				};
			}
		}

		// Components with clickEvent or insertion matching username in extra array
		if (Array.isArray(json.extra)) {
			let foundUser: string | null = null;
			let foundRank: string | null = null;

			for (const part of json.extra) {
				if (!part || typeof part !== "object") continue;
				const comp = part as ChatJsonComponent;
				const clickValue = comp.clickEvent?.value;
				if (clickValue && typeof clickValue === "string") {
					const msgMatch = clickValue.match(/^\/(?:msg|tell|w|whisper)\s+([a-zA-Z0-9_]{3,16})/i);
					if (msgMatch) {
						foundUser = msgMatch[1];
					}
				}
				if (comp.insertion && typeof comp.insertion === "string" && /^[a-zA-Z0-9_]{3,16}$/.test(comp.insertion)) {
					foundUser = comp.insertion;
				}
			}

			if (foundUser) {
				const fullClean = cleanMinecraftText(extractJsonText(json)) || cleanText;
				const userIndex = fullClean.indexOf(foundUser);
				if (userIndex > 0) {
					const beforeUser = fullClean.substring(0, userIndex);
					const rankMatches = beforeUser.match(/\[([^\]]+)\]/g);
					if (rankMatches) {
						foundRank = rankMatches.map((r) => r.slice(1, -1)).join("][");
					}
				}
				const afterUser = fullClean.substring(userIndex + foundUser.length).replace(/^[\s:>»\)\-\]]+/, "").trim();
				return {
					rank: foundRank,
					username: foundUser,
					message: afterUser || cleanText,
				};
			}
		}

		return null;
	}

	private static parseUserMessage(cleanInput: string): { rank: string | null; username: string | null; message: string } {
		// Ignore join, leave, whisper, achievement and system notices from being treated as player chat
		if (
			isJoinMessage(cleanInput) ||
			isLeaveMessage(cleanInput) ||
			isWhisperMsg(cleanInput) ||
			isAchievementMsg(cleanInput) ||
			cleanInput.toLowerCase().startsWith("dùng lệnh") ||
			cleanInput.startsWith("/") ||
			cleanInput.includes(">> [+]") ||
			cleanInput.includes(">> [-]")
		) {
			return { rank: null, username: null, message: cleanInput };
		}

		// Pattern 1: Angle brackets: <[Rank] username> message or <username> message
		const angleMatch = cleanInput.match(/^(?:\[(?<rank0>[^\]]+)\]\s*)?<(?:\s*\[(?<rank1>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})>\s*(?<message>.*)$/);
		if (angleMatch && angleMatch.groups) {
			return {
				rank: angleMatch.groups.rank1 || angleMatch.groups.rank0 || null,
				username: angleMatch.groups.username,
				message: angleMatch.groups.message || "",
			};
		}

		// Pattern 2: Server prefix: e.g. "2Y2C >> [Rank] username: message"
		const prefixMatch = cleanInput.match(/^(?:2Y2C|AnarchyVN|[a-zA-Z0-9_]+)\s*>>\s*(?:<(?:\s*\[(?<rank1>[^\]]+)\]\s*)?(?<user1>[a-zA-Z0-9_]{3,16})>|(?:\[(?<rank2>[^\]]+)\]\s*)?(?<user2>[a-zA-Z0-9_]{3,16})\s*[:»>])\s*(?<message>.*)$/i);
		if (prefixMatch && prefixMatch.groups) {
			return {
				rank: prefixMatch.groups.rank1 || prefixMatch.groups.rank2 || null,
				username: prefixMatch.groups.user1 || prefixMatch.groups.user2,
				message: prefixMatch.groups.message || "",
			};
		}

		// Pattern 3: Colon format: "[VIP] username: message" or "username: message"
		const colonMatch = cleanInput.match(/^(?:((?:\[[^\]]+\]\s*)+))?(?<username>[a-zA-Z0-9_]{3,16})\s*:\s*(?<message>.*)$/);
		if (colonMatch && colonMatch.groups) {
			const rawRanks = colonMatch[1];
			const rank = rawRanks ? rawRanks.match(/\[([^\]]+)\]/g)?.map((r) => r.slice(1, -1)).join("][") : null;
			return {
				rank: rank || null,
				username: colonMatch.groups.username,
				message: colonMatch.groups.message || "",
			};
		}

		// Pattern 4: Arrow format: "[VIP] username » message" or "username » message" or "username > message"
		const arrowMatch = cleanInput.match(/^(?:((?:\[[^\]]+\]\s*)+))?(?<username>[a-zA-Z0-9_]{3,16})\s*[»>]\s*(?<message>.*)$/);
		if (arrowMatch && arrowMatch.groups) {
			const rawRanks = arrowMatch[1];
			const rank = rawRanks ? rawRanks.match(/\[([^\]]+)\]/g)?.map((r) => r.slice(1, -1)).join("][") : null;
			return {
				rank: rank || null,
				username: arrowMatch.groups.username,
				message: arrowMatch.groups.message || "",
			};
		}

		return {
			rank: null,
			username: null,
			message: cleanInput,
		};
	}

	private static formatParsedMessage(
		main: Minecraft,
		cleanText: string,
		parsed: { rank: string | null; username: string | null; message: string },
		rawJson?: ChatJsonComponent | null
	): ParsedChatMessage {
		let { username, rank, message } = parsed;
		let msgType = MessageType.Server;
		let formattedMsg = "";
		const rawText = cleanText;

		let victim: string | null = null;
		let killer: string | null = null;
		let mob: string | null = null;
		let weapon: string | null = null;

		let finalUsername = username;
		let finalRank = rank;

		if (!finalUsername) {
			formattedMsg = escapeDiscordFormat(cleanText);
			const serverIp = main.config.connection.host;

			const joinInfo = extractJoinUsername(cleanText, rawJson);
			const leaveInfo = extractLeaveUsername(cleanText, rawJson);
			const achieveUser = extractAchievementUsername(cleanText);
			const whisperInfo = extractWhisperInfo(cleanText);

			if (whisperInfo || isWhisperMsg(cleanText)) {
				const info = whisperInfo || { sender: "Unknown", message: cleanText };
				const botName = main.bot?.username || main.config.connection.username || "Bot";
				const senderLower = info.sender.toLowerCase();
				const isBotSender =
					senderLower === "me" ||
					senderLower === "tôi" ||
					(main.bot?.username && senderLower === main.bot.username.toLowerCase()) ||
					(main.config.connection.username && senderLower === main.config.connection.username.toLowerCase());

				const resolvedSender = isBotSender ? botName : info.sender;
				let resolvedReceiver = info.receiver || "me";
				const receiverLower = resolvedReceiver.toLowerCase();
				if (receiverLower === "me" || receiverLower === "tôi") {
					resolvedReceiver = botName;
				}

				msgType = MessageType.Whisper;
				finalUsername = resolvedSender;
				const target = resolvedReceiver;
				message = info.message;
				formattedMsg = `**[${resolvedSender} -> ${target}]** ${escapeDiscordFormat(info.message)}`;

				return {
					type: msgType,
					formattedMsg,
					rawText,
					username: finalUsername,
					targetUser: target,
					victim,
					killer,
					mob,
					weapon,
					rank: finalRank,
					message,
				};
			} else if (achieveUser || isAchievementMsg(cleanText)) {
				msgType = MessageType.Achievement;
				if (achieveUser) finalUsername = achieveUser;
			} else if (joinInfo) {
				msgType = MessageType.Join;
				finalUsername = joinInfo.username;
				if (joinInfo.rank) finalRank = joinInfo.rank;
				formattedMsg = finalRank
					? `**\`[+]\` \`[${finalRank}]\` ${escapeDiscordFormat(finalUsername)}**`
					: `**\`[+]\` ${escapeDiscordFormat(finalUsername)}**`;
			} else if (leaveInfo) {
				msgType = MessageType.Quit;
				finalUsername = leaveInfo.username;
				if (leaveInfo.rank) finalRank = leaveInfo.rank;
				formattedMsg = finalRank
					? `**\`[-]\` \`[${finalRank}]\` ${escapeDiscordFormat(finalUsername)}**`
					: `**\`[-]\` ${escapeDiscordFormat(finalUsername)}**`;
			} else if (isJoinMessage(cleanText, rawJson)) {
				msgType = MessageType.Join;
			} else if (isLeaveMessage(cleanText, rawJson)) {
				msgType = MessageType.Quit;
			} else if (isQueueMessage(cleanText)) {
				msgType = MessageType.Queue;
			} else {
				const deathInfo = DeathParserService.extractDeathInfoSync(serverIp, cleanText);
				if (deathInfo) {
					msgType = MessageType.Dead;
					victim = deathInfo.victim;
					killer = deathInfo.killer || null;
					mob = deathInfo.mob || null;
					weapon = deathInfo.weapon || null;
				} else {
					msgType = MessageType.Server;
				}
			}
		} else {
			let prefix = `**<${escapeDiscordFormat(finalUsername)}>**`;
			if (finalRank) {
				prefix = `**<\`[${finalRank}]\` ${escapeDiscordFormat(finalUsername)}>**`;
			}

			formattedMsg = `${prefix} ${escapeDiscordFormat(message)}`;
			const isBot =
				(main.bot?.username && finalUsername.toLowerCase() === main.bot.username.toLowerCase()) ||
				(main.config.connection.username && finalUsername.toLowerCase() === main.config.connection.username.toLowerCase());

			if (isBot) {
				msgType = MessageType.BotChat;
			} else {
				msgType = message.startsWith(">") ? MessageType.HighlightChat : MessageType.Chat;
			}
		}

		return {
			type: msgType,
			formattedMsg,
			rawText,
			username: finalUsername,
			victim,
			killer,
			mob,
			weapon,
			rank: finalRank,
			message,
		};
	}

	/**
	 * Matches text against active death patterns (dynamic memory cache + MongoDB/Redis + default templates)
	 */
	public static isDeathMessage(text: string, serverIp: string = "global"): boolean {
		return DeathParserService.isDeathMessageSync(serverIp, text);
	}

	/**
	 * Matches text against active system patterns (dynamic memory cache + MongoDB/Redis + default templates)
	 */
	public static isSystemMessage(text: string, serverIp: string = "global"): boolean {
		return SystemPatternService.isSystemMessageSync(serverIp, text);
	}
}
