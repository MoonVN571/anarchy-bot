import defaultPatterns from "../config/serverPatterns.json";

export interface ServerPattern {
	id: string;
	serverScope: string;
	pattern: string;
	type: string;
	color: number;
	priority: number;
}

export interface MatchedServerMessage {
	id: string;
	type: string;
	color: number;
	groups: Record<string, string>;
	matchedText: string;
}

export class ServerMessageMatcher {
	private static patterns: ServerPattern[] = defaultPatterns;
	private static regexCache: Map<string, RegExp> = new Map();

	public static match(serverIp: string, text: string): MatchedServerMessage | null {
		if (!text) return null;
		const cleanText = text.trim();

		for (const p of this.patterns) {
			if (p.serverScope !== "global" && p.serverScope !== serverIp) {
				continue;
			}

			let reg = this.regexCache.get(p.pattern);
			if (!reg) {
				try {
					reg = new RegExp(p.pattern, "i");
					this.regexCache.set(p.pattern, reg);
				} catch {
					continue;
				}
			}

			const m = cleanText.match(reg);
			if (m) {
				return {
					id: p.id,
					type: p.type,
					color: p.color,
					groups: m.groups || {},
					matchedText: cleanText,
				};
			}
		}

		return null;
	}
}
