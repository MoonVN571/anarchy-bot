import {
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { DeathCause, DeathModel } from "../../database/models/DeathModel";
import { DeathPatternModel } from "../../database/models/DeathPatternModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { DeathParserService } from "../../services/analytics/DeathParserService";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { isMinecraftMob } from "../../utils/minecraft/minecraftMobs";

export class RefactorDeathsCommand extends Command {
	constructor() {
		super({
			name: "refactordeaths",
			aliases: ["migratedeaths", "fixdeaths", "cleandeaths"],
			description: "Dev: Chuẩn hóa dữ liệu tử vong trên Production sang 3 loại (PVP, DEATH, UNKNOWN) và sửa K/D",
			usage: ">refactordeaths [server]",
			inGameUsage: "!refactordeaths",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, client, serverHost } = ctx;
		const targetServer = ctx.args[0] || serverHost || "all";

		const startTime = Date.now();
		client.logger.info(`[DeathRefactor] Admin ${message.author.tag} started death database refactoring for scope: "${targetServer}"`);

		await message.reply({
			content: `⏳ Đang bắt đầu tiến trình chuẩn hóa dữ liệu tử vong trên Production (Scope: \`${targetServer}\`)... Vui lòng đợi trong giây lát.`,
		});

		try {
			const serverFilter = targetServer === "all" || targetServer === "global" ? {} : { server: targetServer };
			const patternFilter = targetServer === "all" ? {} : { $or: [{ serverScope: "global" }, { serverScope: targetServer }] };

			const legacyCauses: string[] = [
				"MOB",
				"FALL",
				"VOID",
				"LAVA",
				"FIRE",
				"DROWN",
				"EXPLOSION",
				"SUICIDE",
				"MAGIC",
			];

			// 1. Migrate DeathPatternModel legacy causes -> DEATH
			const patternMigrationResult = await DeathPatternModel.updateMany(
				{
					...patternFilter,
					cause: { $nin: [DeathCause.PVP, DeathCause.DEATH, DeathCause.UNKNOWN] } as any,
				},
				{
					$set: { cause: DeathCause.DEATH },
				}
			);
			client.logger.info(`[DeathRefactor] Migrated ${patternMigrationResult.modifiedCount} legacy death patterns to DEATH.`);

			// 2. Migrate DeathModel legacy causes -> DEATH
			const deathMigrationResult = await DeathModel.updateMany(
				{
					...serverFilter,
					cause: { $nin: [DeathCause.PVP, DeathCause.DEATH, DeathCause.UNKNOWN] } as any,
				},
				{
					$set: { cause: DeathCause.DEATH },
				}
			);
			client.logger.info(`[DeathRefactor] Migrated ${deathMigrationResult.modifiedCount} legacy death logs to DEATH.`);

			// 3. Scan PvP records to fix false killers (mobs, bay, fireball, invalid format)
			const pvpDeaths = await DeathModel.find({
				...serverFilter,
				cause: DeathCause.PVP,
			});

			let fixedFalsePvPCount = 0;
			const affectedKillersToRecalculate = new Set<string>();

			for (const death of pvpDeaths) {
				const killer = death.killer;
				if (!killer) continue;

				const isPlayerFormat = /^[a-zA-Z0-9_]{3,16}$/.test(killer);
				const isMob = isMinecraftMob(killer);

				if (!isPlayerFormat || isMob) {
					// Demote from PVP to DEATH
					death.mob = death.killerDisplayName || killer;
					death.killer = null;
					death.killerDisplayName = null;
					death.cause = DeathCause.DEATH;
					await death.save();

					affectedKillersToRecalculate.add(`${death.server}:${killer.toLowerCase()}`);
					fixedFalsePvPCount++;
				}
			}

			client.logger.info(`[DeathRefactor] Fixed ${fixedFalsePvPCount} false PvP records with mob/invalid killer names.`);

			// 4. Recalculate stats for affected false killers
			for (const item of affectedKillersToRecalculate) {
				const [srv, uname] = item.split(":");
				const actualKills = await DeathModel.countDocuments({
					server: srv,
					killer: uname,
					cause: DeathCause.PVP,
				});

				const playerDoc = await PlayerModel.findOne({ server: srv, username: uname });
				if (playerDoc) {
					const safeDeaths = Math.max(0, playerDoc.deaths || 0);
					const kd = safeDeaths > 0 ? parseFloat((actualKills / safeDeaths).toFixed(2)) : actualKills;
					await PlayerModel.updateOne(
						{ _id: playerDoc._id },
						{
							$set: {
								kills: actualKills,
								kdRatio: kd,
							},
						}
					);
					await RedisManager.setLeaderboardScore(srv, "kd", uname, kd);
					await RedisManager.setLeaderboardScore(srv, "kills", uname, actualKills);
				}
			}

			// 5. Invalidate caches
			DeathParserService.clearMemoryCache();
			await RedisManager.invalidateDeathPatterns("global");
			if (targetServer !== "all" && targetServer !== "global") {
				await RedisManager.invalidateDeathPatterns(targetServer);
			}

			const duration = Date.now() - startTime;
			client.logger.info(`[DeathRefactor] Production refactor completed in ${duration}ms.`);

			const container = new ContainerBuilder()
				.setAccentColor(0x2ecc71)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Báo Cáo Chuẩn Hóa Dữ Liệu Tử Vong (Production Refactor)**\n\n` +
						`- **Phạm vi áp dụng:** \`${targetServer}\`\n` +
						`- **Patterns đã chuẩn hóa sang DEATH:** \`${patternMigrationResult.modifiedCount}\`\n` +
						`- **Bản ghi tử vong đã di trú sang DEATH:** \`${deathMigrationResult.modifiedCount}\`\n` +
						`- **Bản ghi PvP giả đã sửa (loại bỏ mob/fireball/bay):** \`${fixedFalsePvPCount}\`\n` +
						`- **Người chơi đã tính toán lại K/D:** \`${affectedKillersToRecalculate.size}\`\n` +
						`- **Thời gian thực hiện:** \`${duration}ms\`\n\n` +
						`*Đã làm mới toàn bộ Memory Cache và Redis Cache.*`
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`*Thực thi bởi @${message.author.username} | Hệ thống hoạt động bình thường*`)
				);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error: any) {
			client.logger.error(`[DeathRefactor] Error during refactoring: ${error}`);
			await message.reply({
				content: `[Lỗi] Tiến trình chuẩn hóa thất bại: ${error.message || error}`,
			});
		}
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string | void> {
		return "[RefactorDeaths] Lệnh này chỉ khả dụng trên Discord dành cho Admin.";
	}
}
