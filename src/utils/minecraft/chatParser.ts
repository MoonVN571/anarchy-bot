import { DeathParserService, SystemPatternService } from "../../services";
import { Minecraft } from "../../structures";

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

export const defaultReplyColor = 0x3498db; // Sky blue (#3498db)

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

export const MINECRAFT_COLOR_MAP: Record<string, { color: string; shadow: string }> = {
	"0": { color: "#000000", shadow: "#000000" },
	"1": { color: "#0000aa", shadow: "#00002a" },
	"2": { color: "#00aa00", shadow: "#002a00" },
	"3": { color: "#00aaaa", shadow: "#002a2a" },
	"4": { color: "#aa0000", shadow: "#2a0000" },
	"5": { color: "#aa00aa", shadow: "#2a002a" },
	"6": { color: "#ffaa00", shadow: "#3f2a00" },
	"7": { color: "#aaaaaa", shadow: "#2a2a2a" },
	"8": { color: "#555555", shadow: "#151515" },
	"9": { color: "#5555ff", shadow: "#15153f" },
	"a": { color: "#55ff55", shadow: "#153f15" },
	"b": { color: "#55ffff", shadow: "#153f3f" },
	"c": { color: "#ff5555", shadow: "#3f1515" },
	"d": { color: "#ff55ff", shadow: "#3f153f" },
	"e": { color: "#ffff55", shadow: "#3f3f15" },
	"f": { color: "#ffffff", shadow: "#3f3f3f" },
};

export interface MinecraftFormattedSegment {
	text: string;
	color: string;
	shadow: string;
	bold: boolean;
	italic: boolean;
}

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
	/**
	 * Strip Minecraft color/format codes (§0-§f, §l-§o, §r)
	 */
	public static cleanMinecraftText(text: string): string {
		if (!text) return "";
		return text.replace(/§[0-9a-fk-or]/gi, "").trim();
	}

	/**
	 * Parse string with Minecraft § formatting codes into structured segments with color and style
	 */
	public static parseMinecraftFormattedSegments(text: string): MinecraftFormattedSegment[] {
		if (!text) return [];

		const segments: MinecraftFormattedSegment[] = [];
		let currentColor = MINECRAFT_COLOR_MAP["f"].color;
		let currentShadow = MINECRAFT_COLOR_MAP["f"].shadow;
		let bold = false;
		let italic = false;

		const parts = text.split(/(§[0-9a-fk-or])/gi);
		for (const part of parts) {
			if (!part) continue;
			if (part.startsWith("§") && part.length === 2) {
				const code = part[1].toLowerCase();
				if (MINECRAFT_COLOR_MAP[code]) {
					currentColor = MINECRAFT_COLOR_MAP[code].color;
					currentShadow = MINECRAFT_COLOR_MAP[code].shadow;
					bold = false;
					italic = false;
				} else if (code === "l") {
					bold = true;
				} else if (code === "o") {
					italic = true;
				} else if (code === "r") {
					currentColor = MINECRAFT_COLOR_MAP["f"].color;
					currentShadow = MINECRAFT_COLOR_MAP["f"].shadow;
					bold = false;
					italic = false;
				}
			} else {
				segments.push({
					text: part,
					color: currentColor,
					shadow: currentShadow,
					bold,
					italic,
				});
			}
		}

		return segments;
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
		return this.formatParsedMessage(main, cleanText, structured, rawJson);
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
		parsed: { rank: string | null; username: string | null; message: string },
		rawJson?: any
	): ParsedChatMessage {
		let { username, rank, message } = parsed;
		let msgType = MessageType.Server;
		let formattedMsg = "";
		let rawText = cleanText;

		let victim: string | null = null;
		let killer: string | null = null;
		let mob: string | null = null;
		let weapon: string | null = null;

		let finalUsername = username;
		let finalRank = rank;

		if (!finalUsername) {
			formattedMsg = this.escapeDiscordFormat(cleanText);
			const serverIp = main.config.connection.host;

			const joinInfo = this.extractJoinUsername(cleanText, rawJson);
			const leaveInfo = this.extractLeaveUsername(cleanText, rawJson);
			const achieveUser = this.extractAchievementUsername(cleanText);
			const whisperInfo = this.extractWhisperInfo(cleanText);

			if (whisperInfo || this.isWhisperMsg(cleanText)) {
				const info = whisperInfo || { sender: "Unknown", message: cleanText };
				const senderLower = info.sender.toLowerCase();
				const isBotOutgoing =
					senderLower === "me" ||
					senderLower === "tôi" ||
					(main.bot?.username && senderLower === main.bot.username.toLowerCase()) ||
					(main.config.connection.username && senderLower === main.config.connection.username.toLowerCase());

				if (isBotOutgoing) {
					msgType = MessageType.BotChat;
				} else {
					msgType = MessageType.Whisper;
				}

				finalUsername = info.sender;
				const target = info.receiver || (isBotOutgoing ? "Player" : "me");
				message = info.message;
				formattedMsg = `**[${info.sender} -> ${target}]** ${this.escapeDiscordFormat(info.message)}`;
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
			} else if (achieveUser || this.isAchievementMsg(cleanText)) {
				msgType = MessageType.Achievement;
				if (achieveUser) finalUsername = achieveUser;
			} else if (joinInfo) {
				msgType = MessageType.Join;
				finalUsername = joinInfo.username;
				if (joinInfo.rank) finalRank = joinInfo.rank;
				formattedMsg = finalRank
					? `**\`[+]\` \`[${finalRank}]\` ${this.escapeDiscordFormat(finalUsername)}**`
					: `**\`[+]\` ${this.escapeDiscordFormat(finalUsername)}**`;
			} else if (leaveInfo) {
				msgType = MessageType.Quit;
				finalUsername = leaveInfo.username;
				if (leaveInfo.rank) finalRank = leaveInfo.rank;
				formattedMsg = finalRank
					? `**\`[-]\` \`[${finalRank}]\` ${this.escapeDiscordFormat(finalUsername)}**`
					: `**\`[-]\` ${this.escapeDiscordFormat(finalUsername)}**`;
			} else if (this.isJoinMessage(cleanText, rawJson)) {
				msgType = MessageType.Join;
			} else if (this.isLeaveMessage(cleanText, rawJson)) {
				msgType = MessageType.Quit;
			} else if (this.isQueueMessage(cleanText)) {
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
			let prefix = `**<${this.escapeDiscordFormat(finalUsername)}>**`;
			let rawPrefix = `<${finalUsername}>`;
			if (finalRank) {
				prefix = `**<\`[${finalRank}]\` ${this.escapeDiscordFormat(finalUsername)}>**`;
				rawPrefix = `[${finalRank}] <${finalUsername}>`;
			}

			formattedMsg = `${prefix} ${this.escapeDiscordFormat(message)}`;
			const isBot = (main.bot?.username && finalUsername.toLowerCase() === main.bot.username.toLowerCase())
				|| (main.config.connection.username && finalUsername.toLowerCase() === main.config.connection.username.toLowerCase());

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

	public static isWhisperMsg(text: string): boolean {
		if (!text) return false;
		const clean = this.cleanMinecraftText(text).trim();
		return (
			/^(?:\[(?<sender>me|tôi|[a-zA-Z0-9_]{3,16})\s*(?:->|tới|đến|to)\s*(?<receiver>me|tôi|[a-zA-Z0-9_]{3,16})\])/i.test(clean) ||
			/^(?:\[(?:To|Đến|From|Từ)\s+[a-zA-Z0-9_]{3,16}\])/i.test(clean) ||
			/^(?:[a-zA-Z0-9_]{3,16}\s+(?:thì\s+thầm|whispers|tells\s+you|whispered\s+to\s+you|nhắn\s+cho\s+bạn):)/i.test(clean) ||
			/^(?:(?:Đến|To)\s+[a-zA-Z0-9_]{3,16}:)/i.test(clean)
		);
	}

	public static extractWhisperInfo(text: string): { sender: string; receiver?: string; message: string } | null {
		if (!text) return null;
		const clean = this.cleanMinecraftText(text).trim();

		// Case 1: [me -> Loaconto] message or [Player -> me] message
		const arrowMatch = clean.match(/^\[(?<sender>me|tôi|[a-zA-Z0-9_]{3,16})\s*(?:->|tới|đến|to)\s*(?<receiver>me|tôi|[a-zA-Z0-9_]{3,16})\]\s*(?<msg>.*)$/i);
		if (arrowMatch && arrowMatch.groups) {
			return {
				sender: arrowMatch.groups.sender,
				receiver: arrowMatch.groups.receiver,
				message: arrowMatch.groups.msg || "",
			};
		}

		// Case 2: [To Player] message or [Đến Player] message
		const toMatch = clean.match(/^\[(?:To|Đến)\s+(?<receiver>[a-zA-Z0-9_]{3,16})\]\s*(?<msg>.*)$/i);
		if (toMatch && toMatch.groups) {
			return {
				sender: "me",
				receiver: toMatch.groups.receiver,
				message: toMatch.groups.msg || "",
			};
		}

		// Case 3: [From Player] message or [Từ Player] message
		const fromMatch = clean.match(/^\[(?:From|Từ)\s+(?<sender>[a-zA-Z0-9_]{3,16})\]\s*(?<msg>.*)$/i);
		if (fromMatch && fromMatch.groups) {
			return {
				sender: fromMatch.groups.sender,
				receiver: "me",
				message: fromMatch.groups.msg || "",
			};
		}

		// Case 4: Player whispers: message / Player tells you: message / Player nhắn cho bạn: message
		const colonMatch = clean.match(/^(?<sender>[a-zA-Z0-9_]{3,16})\s+(?:thì\s+thầm|whispers|tells\s+you|whispered\s+to\s+you|nhắn\s+cho\s+bạn):\s*(?<msg>.*)$/i);
		if (colonMatch && colonMatch.groups) {
			return {
				sender: colonMatch.groups.sender,
				receiver: "me",
				message: colonMatch.groups.msg || "",
			};
		}

		// Case 5: To Player: message or Đến Player: message
		const toColonMatch = clean.match(/^(?:To|Đến)\s+(?<receiver>[a-zA-Z0-9_]{3,16}):\s*(?<msg>.*)$/i);
		if (toColonMatch && toColonMatch.groups) {
			return {
				sender: "me",
				receiver: toColonMatch.groups.receiver,
				message: toColonMatch.groups.msg || "",
			};
		}

		return null;
	}

	public static isAchievementMsg(text: string): boolean {
		return /^\w+ has (made the advancement|completed the challenge|reached the goal) \[.*\]$/i.test(text);
	}

	public static extractAchievementUsername(text: string): string | null {
		if (!text) return null;
		const clean = this.cleanMinecraftText(text);
		const match = clean.match(/^(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})\s+has\s+(?:made the advancement|completed the challenge|reached the goal)/i);
		return match?.groups?.username || null;
	}

	/**
	 * Extract username and optional rank from Join message patterns
	 */
	public static extractJoinUsername(text: string, json?: any): { username: string; rank?: string | null } | null {
		// 1. Check vanilla / server JSON translate (e.g. multiplayer.player.joined, multiplayer.player.joined.renamed)
		if (
			json?.translate &&
			typeof json.translate === "string" &&
			json.translate.startsWith("multiplayer.player.joined") &&
			Array.isArray(json.with) &&
			json.with.length > 0
		) {
			const raw = this.cleanMinecraftText(this.extractJsonText(json.with[0])).trim();
			const match = raw.match(/[a-zA-Z0-9_]{3,16}/);
			if (match) {
				return { username: match[0], rank: null };
			}
		}

		if (!text) return null;
		const clean = this.cleanMinecraftText(text);

		// Pattern 1: [+] [VIP] Steve or >> [+] Steve
		const plusMatch = clean.match(/(?:>>\s*)?\[\+\]\s*(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})/i);
		if (plusMatch && plusMatch.groups) {
			return {
				username: plusMatch.groups.username,
				rank: plusMatch.groups.rank || null,
			};
		}

		// Pattern 2: [Rank] Steve joined the game / đã tham gia / đã kết nối / joined / đã vào / đã trực tuyến / đã đăng nhập
		const textMatch = clean.match(/^(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})\s+(?:joined the game|joined\b|logged in|đã tham gia(?:\s+trò chơi|\s+máy chủ|\s+server)?|đã kết nối(?:\s+vào máy chủ|\s+vào server)?|đã vào(?:\s+trò chơi|\s+máy chủ|\s+server)?|đã trực tuyến|đã đăng nhập)/i);
		if (textMatch && textMatch.groups) {
			return {
				username: textMatch.groups.username,
				rank: textMatch.groups.rank || null,
			};
		}

		return null;
	}

	/**
	 * Extract username and optional rank from Leave/Quit message patterns
	 */
	public static extractLeaveUsername(text: string, json?: any): { username: string; rank?: string | null } | null {
		// 1. Check vanilla / server JSON translate (e.g. multiplayer.player.left, multiplayer.player.left.renamed)
		if (
			json?.translate &&
			typeof json.translate === "string" &&
			json.translate.startsWith("multiplayer.player.left") &&
			Array.isArray(json.with) &&
			json.with.length > 0
		) {
			const raw = this.cleanMinecraftText(this.extractJsonText(json.with[0])).trim();
			const match = raw.match(/[a-zA-Z0-9_]{3,16}/);
			if (match) {
				return { username: match[0], rank: null };
			}
		}

		if (!text) return null;
		const clean = this.cleanMinecraftText(text);

		// Pattern 1: [-] [VIP] Steve or >> [-] Steve
		const minusMatch = clean.match(/(?:>>\s*)?\[\-\]\s*(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})/i);
		if (minusMatch && minusMatch.groups) {
			return {
				username: minusMatch.groups.username,
				rank: minusMatch.groups.rank || null,
			};
		}

		// Pattern 2: [Rank] Steve left the game / đã rời khỏi / đã rời đi / đã mất kết nối / disconnected / left / đã thoát / đã ngoại tuyến / đã offline
		const textMatch = clean.match(/^(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})\s+(?:left the game|left\b|disconnected|đã rời khỏi(?:\s+trò chơi|\s+máy chủ|\s+server)?|đã rời đi|đã mất kết nối|đã thoát(?:\s+khỏi)?(?:\s+trò chơi|\s+máy chủ|\s+server)?|đã thoát|đã ngoại tuyến|đã offline)/i);
		if (textMatch && textMatch.groups) {
			return {
				username: textMatch.groups.username,
				rank: textMatch.groups.rank || null,
			};
		}

		return null;
	}

	public static isJoinMessage(text: string, json?: any): boolean {
		if (json?.translate && typeof json.translate === "string" && json.translate.startsWith("multiplayer.player.joined")) return true;
		if (!text) return false;
		return /(?:>>\s*)?\[\+\]\s*\w+|(?:\b\w+\s+(?:joined the game|joined\b|logged in|đã tham gia|đã kết nối|đã vào|đã trực tuyến|đã đăng nhập))/i.test(text);
	}

	public static isLeaveMessage(text: string, json?: any): boolean {
		if (json?.translate && typeof json.translate === "string" && json.translate.startsWith("multiplayer.player.left")) return true;
		if (!text) return false;
		return /(?:>>\s*)?\[\-\]\s*\w+|(?:\b\w+\s+(?:left the game|left\b|disconnected|đã rời khỏi|đã rời đi|đã mất kết nối|đã thoát|đã ngoại tuyến|đã offline))/i.test(text);
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
