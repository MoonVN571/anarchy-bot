import { Minecraft } from "../../structures";

export interface ResolvedPlayerInfo {
	username: string;
	displayName?: unknown;
	uuid?: string;
	ping?: number;
}

interface BotWithInternalPlayerLookup {
	_playerFromUUID?: (uuid: string) => ResolvedPlayerInfo | undefined;
	uuidToUsername?: Record<string, string>;
	players?: Record<string, ResolvedPlayerInfo>;
}

/**
 * Normalize UUID for consistent lookup (remove hyphens, lowercase)
 */
export function normalizeUuid(uuid: string): string {
	if (!uuid) return "";
	return String(uuid).replace(/-/g, "").toLowerCase().trim();
}

/**
 * Resolve username and player info from UUID or bot cache
 */
export function resolvePlayerByUuid(bot: Minecraft, uuid?: string): ResolvedPlayerInfo | null {
	if (!uuid || !bot?.bot) return null;

	const target = normalizeUuid(uuid);
	if (!target) return null;

	const botInternal = bot.bot as unknown as BotWithInternalPlayerLookup;

	// 1. Try bot._playerFromUUID
	const directPlayer = botInternal._playerFromUUID?.(uuid);
	if (directPlayer?.username) {
		return directPlayer;
	}

	// 2. Try bot.uuidToUsername map
	const uuidMap = botInternal.uuidToUsername;
	if (uuidMap) {
		if (uuidMap[uuid] && botInternal.players?.[uuidMap[uuid]]) {
			return botInternal.players[uuidMap[uuid]];
		}
		for (const [key, name] of Object.entries(uuidMap)) {
			if (normalizeUuid(key) === target && typeof name === "string" && botInternal.players?.[name]) {
				return botInternal.players[name];
			}
		}
	}

	// 3. Search bot.players values
	if (botInternal.players) {
		for (const player of Object.values(botInternal.players)) {
			if (player?.uuid && normalizeUuid(player.uuid) === target) {
				return player;
			}
		}
	}

	return null;
}
