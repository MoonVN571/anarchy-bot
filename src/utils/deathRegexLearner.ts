import { Minecraft } from "../structures/Minecraft";
import { DeathPatternModel, IDeathPattern } from "../database/models/DeathPatternModel";
import { DeathCause } from "../database/models/DeathModel";
import { RedisManager } from "../redis/RedisManager";
import { isMinecraftMob, MINECRAFT_MOBS } from "./minecraftMobs";
import {
	TextChannel,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	ContainerBuilder,
	SectionBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	ThumbnailBuilder,
	MessageFlags,
} from "discord.js";

export class DeathRegexLearner {
	private static pendingMessages = new Set<string>();

	/**
	 * Analyze potential death message and prompt admin / generate candidate regex
	 */
	public static async processUnknownDeathMessage(
		main: Minecraft,
		serverMsg: string
	): Promise<IDeathPattern | null> {
		const cleanMsg = serverMsg.trim();
		const serverIp = main.config.connection.host;

		if (this.pendingMessages.has(`${serverIp}:${cleanMsg}`)) return null;
		this.pendingMessages.add(`${serverIp}:${cleanMsg}`);

		// Prevent duplicate triggers for 10 minutes
		setTimeout(() => this.pendingMessages.delete(`${serverIp}:${cleanMsg}`), 10 * 60 * 1000);

		// 1. Fetch current online player usernames from Redis
		const onlinePlayers = await RedisManager.getOnlinePlayers(serverIp);
		const botPlayers = main.bot?.players ? Object.keys(main.bot.players) : [];
		const allKnownPlayers = Array.from(new Set([...onlinePlayers, ...botPlayers]));

		const matchedPlayers: string[] = [];
		for (const username of allKnownPlayers) {
			if (!username || username.length < 3) continue;
			const regex = new RegExp(`\\b${username}\\b`, "i");
			if (regex.test(cleanMsg)) {
				matchedPlayers.push(username);
			}
		}

		// Also extract any standard Minecraft username format
		const wordTokens = cleanMsg.split(/\s+/);
		for (const token of wordTokens) {
			const cleanToken = token.replace(/[^a-zA-Z0-9_]/g, "");
			if (/^[a-zA-Z0-9_]{3,16}$/.test(cleanToken)) {
				if (!matchedPlayers.includes(cleanToken) && !isMinecraftMob(cleanToken)) {
					matchedPlayers.push(cleanToken);
				}
			}
		}

		if (matchedPlayers.length === 0) {
			return null;
		}

		// 2. Identify victim, killer, or mob
		const victim = matchedPlayers[0];
		let killer: string | null = matchedPlayers.length > 1 ? matchedPlayers[1] : null;

		let detectedMob: string | null = null;
		for (const mobName of MINECRAFT_MOBS) {
			const mobRegex = new RegExp(`\\b${mobName}\\b`, "i");
			if (mobRegex.test(cleanMsg)) {
				detectedMob = mobName;
				break;
			}
		}

		const hasPlayerMobConflict = killer !== null && isMinecraftMob(killer);
		let cause = DeathCause.UNKNOWN;

		if (hasPlayerMobConflict) {
			cause = DeathCause.PVP;
		} else if (killer) {
			cause = DeathCause.PVP;
		} else if (detectedMob) {
			cause = DeathCause.MOB;
		} else if (/ngã|rơi|fall|fell|hit the ground/i.test(cleanMsg)) {
			cause = DeathCause.FALL;
		} else if (/void|hư vô/i.test(cleanMsg)) {
			cause = DeathCause.VOID;
		} else if (/drown|chết đuối|ngạt nước/i.test(cleanMsg)) {
			cause = DeathCause.DROWN;
		} else if (/lava|fire|cháy|dung nham/i.test(cleanMsg)) {
			cause = DeathCause.FIRE;
		} else if (/nổ|tnt|crystal|exploded|blown/i.test(cleanMsg)) {
			cause = DeathCause.EXPLOSION;
		} else if (/magic|wither|thuốc độc|phép/i.test(cleanMsg)) {
			cause = DeathCause.MAGIC;
		} else if (/suicide|tự sát|died/i.test(cleanMsg)) {
			cause = DeathCause.SUICIDE;
		}

		// 3. Auto-generate candidate regex
		let generatedPattern = this.escapeRegex(cleanMsg);
		generatedPattern = generatedPattern.replace(new RegExp(this.escapeRegex(victim), "g"), "(?<victim>[a-zA-Z0-9_]{3,16})");

		if (killer && killer !== victim) {
			generatedPattern = generatedPattern.replace(new RegExp(this.escapeRegex(killer), "g"), "(?<killer>[a-zA-Z0-9_]{3,16})");
		} else if (detectedMob) {
			generatedPattern = generatedPattern.replace(new RegExp(this.escapeRegex(detectedMob), "g"), "(?<mob>.+?)");
		}

		generatedPattern = `^${generatedPattern}$`;

		try {
			const patternName = `auto_learned_${serverIp.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}`;
			const newPattern = await DeathPatternModel.create({
				serverScope: serverIp,
				name: patternName,
				pattern: generatedPattern,
				cause,
				priority: 50,
				enabled: false,
				sampleMessage: cleanMsg,
			});

			const verifyChannelId =
				process.env.DEATH_VERIFY_CHANNEL_ID ||
				(main.client.config as any).deathVerificationChannel;

			const targetChannel =
				(verifyChannelId ? main.client.channels.cache.get(verifyChannelId) : null) as TextChannel ||
				(main.channel as TextChannel);

			if (targetChannel) {
				const row = new ActionRowBuilder<ButtonBuilder>();

				if (hasPlayerMobConflict) {
					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_resolve_pvp_${newPattern._id}`)
							.setLabel(`Là PvP (Player "${killer}")`)
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`death_resolve_mob_${newPattern._id}`)
							.setLabel(`Là Mob (Quái vật "${killer}")`)
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`death_dismiss_${newPattern._id}`)
							.setLabel("Bỏ qua")
							.setStyle(ButtonStyle.Danger)
					);
				} else {
					row.addComponents(
						new ButtonBuilder()
							.setCustomId(`death_approve_${newPattern._id}`)
							.setLabel("Xác nhận")
							.setStyle(ButtonStyle.Success),
						new ButtonBuilder()
							.setCustomId(`death_edit_${newPattern._id}`)
							.setLabel("Sửa Regex")
							.setStyle(ButtonStyle.Primary),
						new ButtonBuilder()
							.setCustomId(`death_dismiss_${newPattern._id}`)
							.setLabel("Bỏ qua")
							.setStyle(ButtonStyle.Danger)
					);
				}

				const causeSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`select_death_cause_${newPattern._id}`)
						.setPlaceholder("Hoặc chọn trực tiếp nguyên nhân tử vong...")
						.addOptions(
							{ label: "PvP (Player vs Player)", value: "PVP", description: "Người chơi tiêu diệt lẫn nhau" },
							{ label: "Mob (Quái vật / Boss)", value: "MOB", description: "Bị quái vật hạ gục" },
							{ label: "Fall (Rơi ngã)", value: "FALL", description: "Rơi từ trên cao" },
							{ label: "Void (Hư vô)", value: "VOID", description: "Rơi vào The Void" },
							{ label: "Drown (Chết đuối)", value: "DROWN", description: "Ngạt nước" },
							{ label: "Explosion (Cháy nổ)", value: "EXPLOSION", description: "Nổ TNT, Crystal, Creeper" },
							{ label: "Fire / Lava (Lửa / Dung nham)", value: "FIRE", description: "Chết cháy hoặc rơi vào dung nham" },
							{ label: "Magic / Wither (Phép thuật)", value: "MAGIC", description: "Thuốc độc, Wither effect" },
							{ label: "Suicide (Tự sát)", value: "SUICIDE", description: "Tự tử / Lệnh kill" },
							{ label: "Khác / Chưa xác định", value: "UNKNOWN", description: "Nguyên nhân khác" }
						)
				);

				const title = hasPlayerMobConflict
					? "**Xung đột: Trùng Tên Người Chơi & Mob**"
					: "**Yêu cầu xác minh Death Message mới**";

				const desc = hasPlayerMobConflict
					? `Tên \`${killer}\` vừa là **Tên người chơi online** vừa là **Tên quái vật (Mob)** trong Minecraft. Vui lòng xác nhận chính xác nguyên nhân bên dưới.`
					: "Bot phát hiện một câu thông báo tử vong chưa có trong danh mục mẫu. Vui lòng xác minh để hoàn tất học mẫu regex.";

				const victimHead = `https://mc-heads.net/avatar/${victim}/64.png`;

				const section = new SectionBuilder()
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`${title}\n${desc}\n\n` +
							`- **Server:** \`${serverIp}\` | **Nguyên nhân:** \`${cause}\`\n` +
							`- **Nạn nhân:** \`${victim}\`${killer ? ` | **Kẻ hạ gục:** \`${killer}\`` : ""}${detectedMob && !killer ? ` | **Quái vật:** \`${detectedMob}\`` : ""}`
						)
					)
					.setThumbnailAccessory(new ThumbnailBuilder().setURL(victimHead).setDescription(`Victim: ${victim}`));

				const container = new ContainerBuilder()
					.setAccentColor(hasPlayerMobConflict ? 0xff4500 : 0xffa500)
					.addSectionComponents(section)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addTextDisplayComponents(
						new TextDisplayBuilder().setContent(
							`**Tin nhắn gốc:**\n\`\`\`${cleanMsg}\`\`\`\n` +
							`**Candidate Regex:**\n\`\`\`regex\n${generatedPattern}\`\`\`\n` +
							`*Pattern ID: ${newPattern._id} | Chờ Admin duyệt*`
						)
					)
					.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
					.addActionRowComponents(row)
					.addActionRowComponents(causeSelectRow);

				targetChannel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
				}).catch((err) => {
					main.client.logger.error(`[DeathRegexLearner] Failed to send verification message: ${err}`);
				});
			}

			return newPattern;
		} catch (err) {
			main.client.logger.error(`[DeathRegexLearner] Failed to create pattern: ${err}`);
			return null;
		}
	}

	private static escapeRegex(string: string): string {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}
