import { Colors } from "discord.js";
import { Minecraft } from "../structures";
import { DeathParserService } from "../services/DeathParserService";
import { SystemPatternService } from "../services/SystemPatternService";

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

export interface ParsedChatMessage {
	type: MessageType;
	formattedMsg: string;
	rawText: string;
	username: string | null;
	rank: string | null;
	message: string;
}

export class ChatParser {
	/**
	 * Strip Minecraft color/format codes (§0-§f, §l-§o, §r)
	 */
	public static cleanMinecraftText(text: string): string {
		if (!text) return "";
		return text.replace(/§[0-9a-fk-or]/gi, "").trim();
	}

	/**
	 * Escape Discord markdown formatting characters
	 */
	public static escapeDiscordFormat(text: string): string {
		if (!text) return "";
		return text.replace(/([*_~`>#\-])/g, "\\$1");
	}

	/**
	 * Recursively extract plain string from JSON chat structure
	 */
	public static extractJsonText(obj: any): string {
		if (!obj) return "";
		if (typeof obj === "string") return obj;
		if (typeof obj === "number") return String(obj);
		if (Array.isArray(obj)) return obj.map(o => this.extractJsonText(o)).join("");

		let res = obj.text || "";
		if (obj.extra && Array.isArray(obj.extra)) {
			res += obj.extra.map((e: any) => this.extractJsonText(e)).join("");
		}
		if (obj.with && Array.isArray(obj.with)) {
			res += obj.with.map((w: any) => this.extractJsonText(w)).join(" ");
		}
		return res;
	}

	/**
	 * Normalize UUID for consistent lookup (remove hyphens, lowercase)
	 */
	public static normalizeUuid(uuid: string): string {
		if (!uuid) return "";
		return String(uuid).replace(/-/g, "").toLowerCase().trim();
	}

	/**
	 * Resolve username and player info from UUID or bot cache
	 */
	public static resolvePlayerByUuid(bot: Minecraft, uuid?: string): { username: string; displayName?: any } | null {
		if (!uuid || !bot?.bot) return null;

		const target = this.normalizeUuid(uuid);
		if (!target) return null;

		// 1. Try bot._playerFromUUID
		const directPlayer = (bot.bot as any)._playerFromUUID?.(uuid);
		if (directPlayer?.username) {
			return directPlayer;
		}

		// 2. Try bot.uuidToUsername map
		const uuidMap = (bot.bot as any).uuidToUsername;
		if (uuidMap) {
			if (uuidMap[uuid] && bot.bot.players?.[uuidMap[uuid]]) {
				return bot.bot.players[uuidMap[uuid]];
			}
			for (const [key, name] of Object.entries(uuidMap)) {
				if (this.normalizeUuid(key) === target && typeof name === "string" && bot.bot.players?.[name]) {
					return bot.bot.players[name];
				}
			}
		}

		// 3. Search bot.players values
		if (bot.bot.players) {
			for (const player of Object.values(bot.bot.players) as any[]) {
				if (player?.uuid && this.normalizeUuid(player.uuid) === target) {
					return player;
				}
			}
		}

		return null;
	}

	/**
	 * Parse chat message from string and optional jsonMsg/sender UUID
	 */
	public static parse(
		main: Minecraft,
		serverMsg: string,
		jsonMsg?: any,
		senderUuid?: string
	): ParsedChatMessage | null {
		const rawJson = jsonMsg?.json || (typeof jsonMsg === "object" && !jsonMsg.toString ? jsonMsg : null);
		const fullText = serverMsg || this.extractJsonText(rawJson) || (jsonMsg?.toString ? jsonMsg.toString() : "");
		if (!fullText) return null;

		const cleanText = this.cleanMinecraftText(fullText);

		// 1. Try structured extraction from jsonMsg and sender UUID
		let structured = this.extractFromJson(rawJson, main, cleanText, senderUuid || jsonMsg?.sender);

		// 2. Fallback to regex parsing on clean text
		if (!structured || !structured.username) {
			structured = this.parseUserMessage(cleanText);
		}

		// 3. Format message according to classification
		return this.formatParsedMessage(main, cleanText, structured);
	}

	private static extractFromJson(
		json: any,
		bot: Minecraft,
		cleanText: string,
		senderUuid?: string
	): { rank: string | null; username: string | null; message: string } | null {
		// Sender UUID resolution from online players cache
		if (senderUuid && bot.bot) {
			const player = this.resolvePlayerByUuid(bot, senderUuid);
			if (player && player.username) {
				let msg = cleanText;
				// If cleanText starts with username / rank, strip it; otherwise cleanText IS the message
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
			const rawSender = this.cleanMinecraftText(this.extractJsonText(json.with[0]));
			const cleanSender = rawSender.replace(/^[<\[\(](.*)[>\]\)]$/, "$1").trim();
			const msg = this.cleanMinecraftText(this.extractJsonText(json.with[1])) || cleanText;
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
				if (!part) continue;
				const clickValue = part.clickEvent?.value;
				if (clickValue && typeof clickValue === "string") {
					const msgMatch = clickValue.match(/^\/(?:msg|tell|w|whisper)\s+([a-zA-Z0-9_]{3,16})/i);
					if (msgMatch) {
						foundUser = msgMatch[1];
					}
				}
				if (part.insertion && typeof part.insertion === "string" && /^[a-zA-Z0-9_]{3,16}$/.test(part.insertion)) {
					foundUser = part.insertion;
				}
			}

			if (foundUser) {
				const fullClean = this.cleanMinecraftText(this.extractJsonText(json)) || cleanText;
				const userIndex = fullClean.indexOf(foundUser);
				if (userIndex > 0) {
					const beforeUser = fullClean.substring(0, userIndex);
					const rankMatches = beforeUser.match(/\[([^\]]+)\]/g);
					if (rankMatches) {
						foundRank = rankMatches.map(r => r.slice(1, -1)).join("][");
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
			this.isJoinMessage(cleanInput) ||
			this.isLeaveMessage(cleanInput) ||
			this.isWhisperMsg(cleanInput) ||
			this.isAchievementMsg(cleanInput) ||
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
			const rank = rawRanks ? rawRanks.match(/\[([^\]]+)\]/g)?.map(r => r.slice(1, -1)).join("][") : null;
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
			const rank = rawRanks ? rawRanks.match(/\[([^\]]+)\]/g)?.map(r => r.slice(1, -1)).join("][") : null;
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
		parsed: { rank: string | null; username: string | null; message: string }
	): ParsedChatMessage {
		const { username, rank, message } = parsed;
		let msgType = MessageType.Server;
		let formattedMsg = "";
		let rawText = cleanText;

		if (!username) {
			formattedMsg = this.escapeDiscordFormat(cleanText);
			const serverIp = main.config.serverInfo.ip;

			if (this.isWhisperMsg(cleanText)) msgType = MessageType.Whisper;
			else if (this.isAchievementMsg(cleanText)) msgType = MessageType.Achievement;
			else if (this.isJoinMessage(cleanText)) msgType = MessageType.Join;
			else if (this.isLeaveMessage(cleanText)) msgType = MessageType.Quit;
			else if (this.isQueueMessage(cleanText)) msgType = MessageType.Queue;
			else if (DeathParserService.isDeathMessageSync(serverIp, cleanText)) msgType = MessageType.Dead;
			else msgType = MessageType.Server;
		} else {
			let prefix = `**<${this.escapeDiscordFormat(username)}>**`;
			let rawPrefix = `<${username}>`;
			if (rank) {
				prefix = `**<\`[${rank}]\` ${this.escapeDiscordFormat(username)}>**`;
				rawPrefix = `[${rank}] <${username}>`;
			}

			formattedMsg = `${prefix} ${this.escapeDiscordFormat(message)}`;
			rawText = `${rawPrefix} ${message}`;
			if (username === main.bot?.username) {
				msgType = MessageType.BotChat;
			} else {
				msgType = message.startsWith(">") ? MessageType.HighlightChat : MessageType.Chat;
			}
		}

		return {
			type: msgType,
			formattedMsg,
			rawText,
			username,
			rank,
			message,
		};
	}

	public static isWhisperMsg(text: string): boolean {
		return /^(?:(?:\w+\s+(?:thì\s+thầm|whispers|tells\s+you|whispered\s+to\s+you):)|(?:(?:Đến|To)\s+\w+:))\s+.*$/i.test(text);
	}

	public static isAchievementMsg(text: string): boolean {
		return /^\w+ has (made the advancement|completed the challenge|reached the goal) \[.*\]$/i.test(text);
	}

	public static isJoinMessage(text: string): boolean {
		return /(?:>>\s*)?\[\+\]\s*\w+|(?:\b\w+\s+(?:joined the game|đã tham gia))/i.test(text);
	}

	public static isLeaveMessage(text: string): boolean {
		return /(?:>>\s*)?\[\-\]\s*\w+|(?:\b\w+\s+(?:left the game|đã rời khỏi|đã rời đi))/i.test(text);
	}

	public static isQueueMessage(text: string): boolean {
		return /(?:vị\s+trí\s+hàng\s+đợi|hàng\s+đợi|queue\s+position|position\s+in\s+queue)/i.test(text);
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
