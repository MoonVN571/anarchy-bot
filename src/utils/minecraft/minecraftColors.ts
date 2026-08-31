export const defaultReplyColor = 0x3498db; // Sky blue (#3498db)

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

export interface ChatJsonComponent {
	text?: string;
	translate?: string;
	with?: (ChatJsonComponent | string | number)[];
	extra?: (ChatJsonComponent | string | number)[];
	clickEvent?: { action?: string; value?: string };
	insertion?: string;
	sender?: string;
	json?: ChatJsonComponent;
	toString?: () => string;
	[key: string]: unknown;
}

/**
 * Strip Minecraft color/format codes (§0-§f, §l-§o, §r)
 */
export function cleanMinecraftText(text: string): string {
	if (!text) return "";
	return text.replace(/§[0-9a-fk-or]/gi, "").trim();
}

/**
 * Parse string with Minecraft § formatting codes into structured segments with color and style
 */
export function parseMinecraftFormattedSegments(text: string): MinecraftFormattedSegment[] {
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
export function escapeDiscordFormat(text: string): string {
	if (!text) return "";
	return text.replace(/([*_~`>#\-])/g, "\\$1");
}

/**
 * Recursively extract plain string from JSON chat structure
 */
export function extractJsonText(obj: unknown): string {
	if (!obj) return "";
	if (typeof obj === "string") return obj;
	if (typeof obj === "number") return String(obj);
	if (Array.isArray(obj)) return obj.map((o) => extractJsonText(o)).join("");

	if (typeof obj === "object") {
		const comp = obj as ChatJsonComponent;
		let res = comp.text || "";
		if (comp.extra && Array.isArray(comp.extra)) {
			res += comp.extra.map((e) => extractJsonText(e)).join("");
		}
		if (comp.with && Array.isArray(comp.with)) {
			res += comp.with.map((w) => extractJsonText(w)).join(" ");
		}
		return res;
	}

	return "";
}
