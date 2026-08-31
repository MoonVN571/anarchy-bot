import { ParsedChatMessage, MessageType } from "./chatParser";

export class SpamDetector {
	private static readonly DEFAULT_WINDOW_MS = 15 * 1000; // 15 seconds window
	private lastMessageMap = new Map<string, { signature: string; timestamp: number; count: number }>();

	/**
	 * Generate a unique signature for a parsed chat message
	 */
	public static getSignature(parsed: ParsedChatMessage, serverHost: string): string {
		const type = parsed.type;
		if ((type === MessageType.Chat || type === MessageType.HighlightChat) && parsed.username) {
			const cleanMsg = (parsed.message || "").trim().toLowerCase();
			return `${serverHost}:chat:${parsed.username.toLowerCase()}:${cleanMsg}`;
		}

		if (type === MessageType.Dead) {
			const victim = (parsed.victim || parsed.username || "").toLowerCase();
			const killer = (parsed.killer || parsed.mob || "").toLowerCase();
			return `${serverHost}:dead:${victim}:${killer}:${(parsed.rawText || "").trim().toLowerCase()}`;
		}

		const rawClean = (parsed.formattedMsg || parsed.rawText || "").trim().toLowerCase();
		return `${serverHost}:${type}:${parsed.username ? parsed.username.toLowerCase() : "none"}:${rawClean}`;
	}

	/**
	 * Check if a message is spam / duplicate.
	 * If duplicate, returns the current repetition count (>= 2).
	 * If first occurrence, returns 1.
	 */
	public checkDuplicate(
		parsed: ParsedChatMessage,
		serverHost: string,
		windowMs: number = SpamDetector.DEFAULT_WINDOW_MS
	): { isSpam: boolean; count: number } {
		const sig = SpamDetector.getSignature(parsed, serverHost);
		const now = Date.now();
		const entry = this.lastMessageMap.get(serverHost);

		if (entry && entry.signature === sig && now - entry.timestamp < windowMs) {
			entry.count++;
			entry.timestamp = now;
			return { isSpam: true, count: entry.count };
		}

		// New or expired message
		this.lastMessageMap.set(serverHost, {
			signature: sig,
			timestamp: now,
			count: 1,
		});

		return { isSpam: false, count: 1 };
	}

	/**
	 * Clean up memory for inactive servers
	 */
	public clear(serverHost?: string): void {
		if (serverHost) {
			this.lastMessageMap.delete(serverHost);
		} else {
			this.lastMessageMap.clear();
		}
	}
}

export const globalSpamDetector = new SpamDetector();
