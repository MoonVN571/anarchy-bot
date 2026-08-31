import { DeathCause, DeathModel, IDeath } from "../../database/models/DeathModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { Logger } from "../../structures/Logger";

export interface ParsedDeath {
	victim: string;
	killer?: string | null;
	mob?: string | null;
	weapon?: string | null;
	cause: DeathCause;
	rawMessage: string;
}

export class DeathStatsService {
	/**
	 * Direct recording of death stats and updating PlayerModel + Redis Leaderboards
	 */
	public static async recordDeathStatsDirect(
		server: string,
		parsed: ParsedDeath,
		logger?: Logger | null
	): Promise<IDeath | null> {
		try {
			// 1. Save death log
			const deathRecord = await DeathModel.create({
				server,
				victim: parsed.victim.toLowerCase(),
				victimDisplayName: parsed.victim,
				killer: parsed.killer ? parsed.killer.toLowerCase() : null,
				killerDisplayName: parsed.killer || null,
				mob: parsed.mob,
				weapon: parsed.weapon,
				cause: parsed.cause,
				rawMessage: parsed.rawMessage,
				timestamp: new Date(),
			});

			// 2. Update victim stats
			const victimLower = parsed.victim.toLowerCase();
			await RedisManager.incrementLeaderboard(server, "deaths", victimLower, 1);

			const victimInc: Record<string, number> = { deaths: 1 };
			if (parsed.cause === DeathCause.SUICIDE) victimInc.suicides = 1;
			if (parsed.cause === DeathCause.MOB) victimInc.mobDeaths = 1;

			const victimDoc = await PlayerModel.findOneAndUpdate(
				{ server, username: victimLower },
				{
					$setOnInsert: {
						server,
						username: victimLower,
						displayName: parsed.victim,
						firstSeen: new Date(),
						playtime: 0,
						kills: 0,
						messageCount: 0,
						joinCount: 1,
						leaveCount: 0,
					},
					$set: {
						lastSeen: new Date(),
						currentKillstreak: 0,
					},
					$inc: victimInc,
				},
				{ upsert: true, returnDocument: "after" }
			);

			if (victimDoc) {
				const kd = victimDoc.deaths > 0 ? parseFloat((victimDoc.kills / victimDoc.deaths).toFixed(2)) : victimDoc.kills;
				await PlayerModel.updateOne({ _id: victimDoc._id }, { $set: { kdRatio: kd } });
				await RedisManager.setLeaderboardScore(server, "kd", victimLower, kd);
				if (logger) logger.debug("Death/KD", `[${server}] Victim "${parsed.victim}" stats updated: Deaths=${victimDoc.deaths}, K/D=${kd}`);
			}

			// 3. Update killer stats (PvP)
			if (parsed.killer) {
				const killerLower = parsed.killer.toLowerCase();
				await RedisManager.incrementLeaderboard(server, "kills", killerLower, 1);

				const killerDoc = await PlayerModel.findOneAndUpdate(
					{ server, username: killerLower },
					{
						$setOnInsert: {
							server,
							username: killerLower,
							displayName: parsed.killer,
							firstSeen: new Date(),
							playtime: 0,
							deaths: 0,
							messageCount: 0,
							joinCount: 1,
							leaveCount: 0,
						},
						$set: {
							lastSeen: new Date(),
						},
						$inc: {
							kills: 1,
							currentKillstreak: 1,
						},
					},
					{ upsert: true, returnDocument: "after" }
				);

				if (killerDoc) {
					const newStreak = killerDoc.currentKillstreak || 1;
					const maxStreak = Math.max(killerDoc.highestKillstreak || 0, newStreak);
					const kd = killerDoc.deaths > 0 ? parseFloat((killerDoc.kills / killerDoc.deaths).toFixed(2)) : killerDoc.kills;

					await PlayerModel.updateOne(
						{ _id: killerDoc._id },
						{
							$set: {
								highestKillstreak: maxStreak,
								kdRatio: kd,
							},
						}
					);
					await RedisManager.setLeaderboardScore(server, "kd", killerLower, kd);
					if (logger) logger.debug("Death/KD", `[${server}] Killer "${parsed.killer}" stats updated: Kills=${killerDoc.kills}, Streak=${newStreak}, K/D=${kd}`);
				}
			}

			return deathRecord;
		} catch {
			return null;
		}
	}

	/**
	 * Retroactively fix and recalculate player stats if an admin corrected victim or killer
	 */
	public static async retroactivelyFixDeathStats(
		server: string,
		sampleMessage: string,
		correctedVictim: string,
		correctedKiller: string | null,
		correctedMob: string | null,
		correctedCause: DeathCause
	): Promise<void> {
		if (!sampleMessage) return;

		try {
			// Find existing death log recorded for this message
			const existingDeath = await DeathModel.findOne({
				server,
				rawMessage: sampleMessage,
			}).sort({ timestamp: -1 });

			const victimLower = correctedVictim.toLowerCase().trim();
			const killerLower = correctedKiller ? correctedKiller.toLowerCase().trim() : null;

			if (existingDeath) {
				const oldVictimLower = existingDeath.victim.toLowerCase();
				const oldKillerLower = existingDeath.killer ? existingDeath.killer.toLowerCase() : null;

				// A. Fix Victim if changed
				if (oldVictimLower !== victimLower) {
					// Revert death from old victim
					const oldVictimDoc = await PlayerModel.findOneAndUpdate(
						{ server, username: oldVictimLower },
						{ $inc: { deaths: -1 } },
						{ returnDocument: "after" }
					);
					if (oldVictimDoc) {
						const safeDeaths = Math.max(0, oldVictimDoc.deaths);
						const kd = safeDeaths > 0 ? parseFloat((oldVictimDoc.kills / safeDeaths).toFixed(2)) : oldVictimDoc.kills;
						await PlayerModel.updateOne({ _id: oldVictimDoc._id }, { $set: { deaths: safeDeaths, kdRatio: kd } });
					}

					// Add death to corrected victim
					const newVictimDoc = await PlayerModel.findOneAndUpdate(
						{ server, username: victimLower },
						{
							$setOnInsert: {
								server,
								username: victimLower,
								displayName: correctedVictim,
								firstSeen: new Date(),
								playtime: 0,
								kills: 0,
								messageCount: 0,
								joinCount: 1,
								leaveCount: 0,
							},
							$set: { lastSeen: new Date() },
							$inc: { deaths: 1 },
						},
						{ upsert: true, returnDocument: "after" }
					);
					if (newVictimDoc) {
						const kd = newVictimDoc.deaths > 0 ? parseFloat((newVictimDoc.kills / newVictimDoc.deaths).toFixed(2)) : newVictimDoc.kills;
						await PlayerModel.updateOne({ _id: newVictimDoc._id }, { $set: { kdRatio: kd } });
					}
				}

				// B. Fix Killer if changed
				if (oldKillerLower !== killerLower) {
					if (oldKillerLower) {
						// Revert kill from old killer
						const oldKillerDoc = await PlayerModel.findOneAndUpdate(
							{ server, username: oldKillerLower },
							{ $inc: { kills: -1 } },
							{ returnDocument: "after" }
						);
						if (oldKillerDoc) {
							const safeKills = Math.max(0, oldKillerDoc.kills);
							const kd = oldKillerDoc.deaths > 0 ? parseFloat((safeKills / oldKillerDoc.deaths).toFixed(2)) : safeKills;
							await PlayerModel.updateOne({ _id: oldKillerDoc._id }, { $set: { kills: safeKills, kdRatio: kd } });
						}
					}

					if (killerLower) {
						// Add kill to corrected killer
						const newKillerDoc = await PlayerModel.findOneAndUpdate(
							{ server, username: killerLower },
							{
								$setOnInsert: {
									server,
									username: killerLower,
									displayName: correctedKiller!,
									firstSeen: new Date(),
									playtime: 0,
									deaths: 0,
									messageCount: 0,
									joinCount: 1,
									leaveCount: 0,
								},
								$set: { lastSeen: new Date() },
								$inc: { kills: 1 },
							},
							{ upsert: true, returnDocument: "after" }
						);
						if (newKillerDoc) {
							const kd = newKillerDoc.deaths > 0 ? parseFloat((newKillerDoc.kills / newKillerDoc.deaths).toFixed(2)) : newKillerDoc.kills;
							await PlayerModel.updateOne({ _id: newKillerDoc._id }, { $set: { kdRatio: kd } });
						}
					}
				}

				// Update the death log
				existingDeath.victim = victimLower;
				existingDeath.victimDisplayName = correctedVictim;
				existingDeath.killer = killerLower;
				existingDeath.killerDisplayName = correctedKiller || null;
				existingDeath.mob = correctedMob || null;
				existingDeath.cause = correctedCause;
				await existingDeath.save();
			}
		} catch {
			// Catch error safely
		}
	}
}
