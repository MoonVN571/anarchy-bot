import { DeathCause } from "../../database/models/DeathModel";
import { DeathPatternModel, IDeathPattern } from "../../database/models/DeathPatternModel";
import { RedisManager } from "../../redis/RedisManager";
import { Minecraft } from "../../structures/Minecraft";
import { DeathRegexLearner, defaultDeathPatterns } from "../../utils";
import { isMinecraftMob } from "../../utils/minecraft/minecraftMobs";
import { DeathStatsService, ParsedDeath } from "./DeathStatsService";
import { DeathVerificationService } from "./DeathVerificationService";

export { ParsedDeath };

export class DeathParserService {
	private static memoryCache: Map<string, { regex: RegExp; patternDoc: IDeathPattern }[]> = new Map();

	/**
	 * Invalidate memory cache and Redis cache for a server
	 */
	public static invalidateCache(server: string): void {
		this.memoryCache.delete(server.toLowerCase());
		this.memoryCache.delete("global");
		RedisManager.invalidateDeathPatterns(server).catch(() => { });
	}

	public static clearMemoryCache(): void {
		this.memoryCache.clear();
	}

	/**
	 * Synchronously check if a text matches any active death pattern (DB/Redis cache + defaults)
	 */
	public static isDeathMessageSync(server: string, text: string): boolean {
		if (!text) return false;
		const clean = text.trim();
		const s = server.toLowerCase();

		const cached = this.memoryCache.get(s) || this.memoryCache.get("global");
		if (cached && cached.length > 0) {
			for (const { regex } of cached) {
				if (regex.test(clean)) return true;
			}
		}

		for (const p of defaultDeathPatterns) {
			try {
				if (new RegExp(p.pattern, "i").test(clean)) return true;
			} catch {
				// Ignore
			}
		}
		return false;
	}

	/**
	 * Helper to sanitize killer and death cause, filtering mobs, non-players (bay, fireball), and ensuring non-PVP deaths have no killer
	 */
	public static sanitizeDeathCause(
		killer: string | null,
		mob: string | null,
		initialCause: DeathCause
	): { killer: string | null; mob: string | null; cause: DeathCause } {
		let cleanKiller = killer;
		let cleanMob = mob;
		let cause = initialCause || DeathCause.DEATH;

		if (cleanKiller) {
			const isPlayerFormat = /^[a-zA-Z0-9_]{3,16}$/.test(cleanKiller);
			const isMob = isMinecraftMob(cleanKiller);
			if (!isPlayerFormat || isMob) {
				cleanMob = cleanKiller;
				cleanKiller = null;
				cause = DeathCause.DEATH;
			}
		}

		if (cause !== DeathCause.PVP) {
			cleanKiller = null;
		}

		return { killer: cleanKiller, mob: cleanMob, cause };
	}

	/**
	 * Synchronously extract victim, killer, mob, weapon from death message
	 */
	public static extractDeathInfoSync(
		server: string,
		text: string
	): {
		victim: string;
		killer?: string | null;
		mob?: string | null;
		weapon?: string | null;
		cause: DeathCause;
	} | null {
		if (!text) return null;
		const clean = text.trim();
		if (
			clean.includes("[Bot Tip]") ||
			clean.startsWith("[BOT]") ||
			clean.startsWith("> [BOT]")
		) {
			return null;
		}
		const s = server.toLowerCase();

		const cached = this.memoryCache.get(s) || this.memoryCache.get("global");
		if (cached && cached.length > 0) {
			for (const { regex, patternDoc } of cached) {
				const m = clean.match(regex);
				if (m && m.groups && m.groups.victim) {
					const rawKiller = m.groups.killer ? m.groups.killer.trim() : null;
					const rawMob = m.groups.mob ? m.groups.mob.trim() : null;
					const sanitized = this.sanitizeDeathCause(rawKiller, rawMob, patternDoc.cause);

					return {
						victim: m.groups.victim.trim(),
						killer: sanitized.killer,
						mob: sanitized.mob,
						weapon: m.groups.weapon ? m.groups.weapon.trim() : null,
						cause: sanitized.cause,
					};
				}
			}
		}

		for (const p of defaultDeathPatterns) {
			try {
				const m = clean.match(new RegExp(p.pattern, "i"));
				if (m && m.groups && m.groups.victim) {
					const rawKiller = m.groups.killer ? m.groups.killer.trim() : null;
					const rawMob = m.groups.mob ? m.groups.mob.trim() : null;
					const sanitized = this.sanitizeDeathCause(rawKiller, rawMob, p.cause);

					return {
						victim: m.groups.victim.trim(),
						killer: sanitized.killer,
						mob: sanitized.mob,
						weapon: m.groups.weapon ? m.groups.weapon.trim() : null,
						cause: sanitized.cause,
					};
				}
			} catch {
				// Ignore
			}
		}

		return null;
	}

	/**
	 * Get compiled regex patterns for a server (Runtime Merge: DB Verified Patterns + Default Patterns)
	 */
	public static async getPatternsForServer(server: string): Promise<{ regex: RegExp; patternDoc: IDeathPattern }[]> {
		const s = server.toLowerCase();

		if (this.memoryCache.has(s) && this.memoryCache.get(s)!.length > 0) {
			return this.memoryCache.get(s)!;
		}

		// 1. Try Redis cache for merged patterns
		let mergedPatterns: IDeathPattern[] | null = await RedisManager.getCachedDeathPatterns(server);

		// 2. If not in Redis, load verified patterns from MongoDB and merge with default patterns
		if (!mergedPatterns || mergedPatterns.length === 0) {
			let dbPatterns: IDeathPattern[] = [];
			try {
				dbPatterns = (await DeathPatternModel.find({
					$or: [{ serverScope: "global" }, { serverScope: server }],
					enabled: true,
				})
					.sort({ priority: -1, createdAt: -1 })
					.lean()) as unknown as IDeathPattern[];
			} catch {
				dbPatterns = [];
			}

			// Map default patterns to match pattern structure
			const defaultsMapped: IDeathPattern[] = defaultDeathPatterns.map((d) => ({
				_id: `default_${d.name}` as unknown,
				serverScope: d.serverScope,
				name: d.name,
				pattern: d.pattern,
				cause: d.cause,
				priority: d.priority,
				enabled: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as unknown as IDeathPattern));

			// Merge: DB verified patterns take priority, avoid duplicates by name or exact pattern
			const seenNames = new Set<string>();
			const seenRegex = new Set<string>();
			mergedPatterns = [];

			for (const p of dbPatterns) {
				seenNames.add(p.name);
				seenRegex.add(p.pattern);
				mergedPatterns.push(p);
			}

			for (const d of defaultsMapped) {
				if (!seenNames.has(d.name) && !seenRegex.has(d.pattern)) {
					seenNames.add(d.name);
					seenRegex.add(d.pattern);
					mergedPatterns.push(d);
				}
			}

			// Cache merged patterns into Redis (1 hour TTL)
			if (mergedPatterns.length > 0) {
				await RedisManager.cacheDeathPatterns(server, mergedPatterns);
			}
		}

		// 3. Compile regex patterns into memory
		const compiled: { regex: RegExp; patternDoc: IDeathPattern }[] = [];
		for (const p of mergedPatterns || []) {
			try {
				const regex = new RegExp(p.pattern, "i");
				compiled.push({ regex, patternDoc: p });
			} catch {
				// Skip invalid regex
			}
		}

		this.memoryCache.set(s, compiled);
		return compiled;
	}

	/**
	 * Parse server message to check if it's a death event
	 */
	public static async handleDeathMessage(main: Minecraft, serverMsg: string): Promise<ParsedDeath | null> {
		if (!serverMsg) return null;

		const cleanMsg = serverMsg.trim();
		if (
			cleanMsg.includes("[Bot Tip]") ||
			cleanMsg.startsWith("[BOT]") ||
			cleanMsg.startsWith("> [BOT]")
		) {
			return null;
		}

		const serverIp = main.config.connection.host;

		const patterns = await this.getPatternsForServer(serverIp);

		// 1. Try matching with active patterns
		for (const { regex, patternDoc } of patterns) {
			const match = cleanMsg.match(regex);
			if (match && match.groups && match.groups.victim) {
				const victim = match.groups.victim.trim();
				const rawKiller = match.groups.killer ? match.groups.killer.trim() : null;
				const rawMob = match.groups.mob ? match.groups.mob.trim() : null;
				const weapon = match.groups.weapon ? match.groups.weapon.trim() : null;
				const sanitized = this.sanitizeDeathCause(rawKiller, rawMob, patternDoc.cause);

				const parsed: ParsedDeath = {
					victim,
					killer: sanitized.killer,
					mob: sanitized.mob,
					weapon,
					cause: sanitized.cause,
					rawMessage: cleanMsg,
				};

				main.client.logger.debug(
					"Death/KD",
					`[${serverIp}] Matched pattern "${patternDoc.name}" -> Victim: "${victim}", Killer: ${sanitized.killer ? `"${sanitized.killer}"` : "null"}, Mob: ${sanitized.mob ? `"${sanitized.mob}"` : "null"}, Cause: ${sanitized.cause}`
				);

				await DeathStatsService.recordDeathStatsDirect(serverIp, parsed, main?.client?.logger);
				return parsed;
			}
		}

		return null;
	}

	// Backwards-compatible delegates for stats and verification
	public static recordDeathStatsDirect = DeathStatsService.recordDeathStatsDirect;
	public static retroactivelyFixDeathStats = DeathStatsService.retroactivelyFixDeathStats;
	public static onPatternApproved = DeathVerificationService.onPatternApproved;
	public static reverifyAllDeathsInDb = DeathVerificationService.reverifyAllDeathsInDb;
}
