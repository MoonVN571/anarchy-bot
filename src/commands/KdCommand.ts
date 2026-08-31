import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { StatsService } from "../services";
import { Command, CommandContext, InGameCommandContext } from "../typings";

export class KdCommand extends Command {
	constructor() {
		super({
			name: "kd",
			aliases: ["killdeath", "pvp"],
			description: "Xem tỉ lệ K/D và thống kê PvP của người chơi",
			usage: ">kd <tên_người_chơi>",
			inGameUsage: "!kd [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>kd MoonVN\`)`,
			});
			return;
		}

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);

		if (!stats) {
			await message.reply({
				content: `Không tìm thấy dữ liệu thống kê của người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const kills = stats.kills || 0;
		const deaths = stats.deaths || 0;
		const suicides = stats.suicides || 0;
		const mobDeaths = stats.mobDeaths || 0;
		const pvpDeaths = Math.max(0, deaths - suicides - mobDeaths);
		const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);

		const username = stats.displayName || stats.username;
		const headUrl = `https://mc-heads.net/avatar/${stats.username}/128.png`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Chỉ số K/D: ${username}**\n` +
					`- Tỉ lệ K/D: **${kdRatio}**\n` +
					`- Kills: **${kills}** | Tổng Deaths: **${deaths}**\n` +
					`- PvP Deaths: **${pvpDeaths}** | Mob Deaths: **${mobDeaths}** | Suicide: **${suicides}**`
				)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
			);

		const container = new ContainerBuilder()
			.setAccentColor(0xe74c3c)
			.addSectionComponents(section)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`🔥 Killstreak Hiện tại: **${stats.currentKillstreak || 0}** | Cao nhất: **${stats.highestKillstreak || 0}**\n` +
					`*Máy chủ: ${serverHost}*`
				)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[K/D] Không tìm thấy thống kê của người chơi "${targetUser}".`;
		}

		const kills = stats.kills || 0;
		const deaths = stats.deaths || 0;
		const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
		const currStreak = stats.currentKillstreak || 0;
		const maxStreak = stats.highestKillstreak || 0;

		return `[K/D] ${stats.displayName || stats.username}: ${kills} Kills / ${deaths} Deaths (K/D: ${kdRatio}) | Killstreak: ${currStreak} (Cao nhất: ${maxStreak})`;
	}
}
