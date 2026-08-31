import { cleanMinecraftText, extractJsonText, ChatJsonComponent } from "./minecraftColors";

export interface WhisperInfo {
	sender: string;
	receiver?: string;
	message: string;
}

export interface JoinLeaveInfo {
	username: string;
	rank?: string | null;
}

/**
 * Check if text matches whisper patterns
 */
export function isWhisperMsg(text: string): boolean {
	if (!text) return false;
	const clean = cleanMinecraftText(text).trim();
	return (
		/^(?:\[(?<sender>me|tôi|[a-zA-Z0-9_]{3,16})\s*(?:->|tới|đến|to)\s*(?<receiver>me|tôi|[a-zA-Z0-9_]{3,16})\])/i.test(clean) ||
		/^(?:\[(?:To|Đến|From|Từ)\s+[a-zA-Z0-9_]{3,16}\])/i.test(clean) ||
		/^(?:[a-zA-Z0-9_]{3,16}\s+(?:thì\s+thầm|whispers|tells\s+you|whispered\s+to\s+you|nhắn\s+cho\s+bạn):)/i.test(clean) ||
		/^(?:(?:Đến|To)\s+[a-zA-Z0-9_]{3,16}:)/i.test(clean)
	);
}

/**
 * Extract sender, receiver, message from whisper
 */
export function extractWhisperInfo(text: string): WhisperInfo | null {
	if (!text) return null;
	const clean = cleanMinecraftText(text).trim();

	// Case 1: [me -> Player] message or [Player -> me] message
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

/**
 * Check if text is an achievement/advancement message
 */
export function isAchievementMsg(text: string): boolean {
	return /^\w+ has (made the advancement|completed the challenge|reached the goal) \[.*\]$/i.test(text);
}

/**
 * Extract username from achievement message
 */
export function extractAchievementUsername(text: string): string | null {
	if (!text) return null;
	const clean = cleanMinecraftText(text);
	const match = clean.match(/^(?:\[(?<rank>[^\]]+)\]\s*)?(?<username>[a-zA-Z0-9_]{3,16})\s+has\s+(?:made the advancement|completed the challenge|reached the goal)/i);
	return match?.groups?.username || null;
}

/**
 * Extract username and optional rank from Join message patterns
 */
export function extractJoinUsername(text: string, json?: ChatJsonComponent | null): JoinLeaveInfo | null {
	// 1. Check vanilla / server JSON translate (e.g. multiplayer.player.joined, multiplayer.player.joined.renamed)
	if (
		json?.translate &&
		typeof json.translate === "string" &&
		json.translate.startsWith("multiplayer.player.joined") &&
		Array.isArray(json.with) &&
		json.with.length > 0
	) {
		const raw = cleanMinecraftText(extractJsonText(json.with[0])).trim();
		const match = raw.match(/[a-zA-Z0-9_]{3,16}/);
		if (match) {
			return { username: match[0], rank: null };
		}
	}

	if (!text) return null;
	const clean = cleanMinecraftText(text);

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
export function extractLeaveUsername(text: string, json?: ChatJsonComponent | null): JoinLeaveInfo | null {
	// 1. Check vanilla / server JSON translate (e.g. multiplayer.player.left, multiplayer.player.left.renamed)
	if (
		json?.translate &&
		typeof json.translate === "string" &&
		json.translate.startsWith("multiplayer.player.left") &&
		Array.isArray(json.with) &&
		json.with.length > 0
	) {
		const raw = cleanMinecraftText(extractJsonText(json.with[0])).trim();
		const match = raw.match(/[a-zA-Z0-9_]{3,16}/);
		if (match) {
			return { username: match[0], rank: null };
		}
	}

	if (!text) return null;
	const clean = cleanMinecraftText(text);

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

export function isJoinMessage(text: string, json?: ChatJsonComponent | null): boolean {
	if (json?.translate && typeof json.translate === "string" && json.translate.startsWith("multiplayer.player.joined")) return true;
	if (!text) return false;
	return /(?:>>\s*)?\[\+\]\s*\w+|(?:\b\w+\s+(?:joined the game|joined\b|logged in|đã tham gia|đã kết nối|đã vào|đã trực tuyến|đã đăng nhập))/i.test(text);
}

export function isLeaveMessage(text: string, json?: ChatJsonComponent | null): boolean {
	if (json?.translate && typeof json.translate === "string" && json.translate.startsWith("multiplayer.player.left")) return true;
	if (!text) return false;
	return /(?:>>\s*)?\[\-\]\s*\w+|(?:\b\w+\s+(?:left the game|left\b|disconnected|đã rời khỏi|đã rời đi|đã mất kết nối|đã thoát|đã ngoại tuyến|đã offline))/i.test(text);
}

export function isQueueMessage(text: string): boolean {
	return /(?:vị\s+trí\s+hàng\s+đợi|hàng\s+đợi|queue\s+position|position\s+in\s+queue)/i.test(text);
}
