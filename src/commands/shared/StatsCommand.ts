import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { StatsService } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { formatDuration, formatTimeAgo } from "../../utils";

export class StatsCommand extends Command {
	constructor() {
		super({
			name: "stats",
			aliases: ["profile", "info", "player"],
			description: "Xem hồ sơ chi tiết và thông số người chơi",
			usage: ">stats <tên_người_chơi>",
			inGameUsage: "!stats [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>stats MoonVN\`)`,
			});
			return;
		}

		const stats = await StatsService.getPlayerStats(serverHost, targetUser);

		if (!stats) {
			await message.reply({
				content: `Không tìm thấy dữ liệu người chơi **${targetUser}** trên server \`${serverHost}\`.`,
			});
			return;
		}

		const kdRatio = (stats.deaths || 0) > 0
			? ((stats.kills || 0) / stats.deaths).toFixed(2)
			: (stats.kills || 0).toFixed(2);

		const username = stats.displayName || stats.username;
		const headUrl = `https://mc-heads.net/avatar/${stats.username}/128.png`;
		const statusText = stats.isOnline ? "Online" : "Offline";
		const accentColor = stats.isOnline ? 0x2ecc71 : 0x95a5a6;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Hồ sơ: ${username}** (${statusText})\n` +
					`- Playtime: **${formatDuration(stats.playtime || 0)}**\n` +
					`- K/D: **${kdRatio}** (${stats.kills || 0} Kills / ${stats.deaths || 0} Deaths)\n` +
					`- Messages: **${(stats.messageCount || 0).toLocaleString()}**\n` +
					`- Số lần tham gia: **${(stats.joinCount || 1).toLocaleString()}**\n` +
					`- Lần đầu: ${stats.firstSeen ? formatTimeAgo(stats.firstSeen) : "N/A"} | Lần cuối: ${stats.lastSeen ? formatTimeAgo(stats.lastSeen) : "N/A"}`
				)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
			);

		const container = new ContainerBuilder()
			.setAccentColor(accentColor)
			.addSectionComponents(section)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string[] | string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[Stats] Không tìm thấy thông tin của người chơi "${targetUser}".`;
		}

		const kdRatio = (stats.deaths || 0) > 0
			? ((stats.kills || 0) / stats.deaths).toFixed(2)
			: (stats.kills || 0).toFixed(2);
		const ptStr = formatDuration(stats.playtime || 0);
		const status = stats.isOnline ? "Online" : "Offline";

		return [
			`[Stats] ${stats.displayName || stats.username} (${status})`,
			`Playtime: ${ptStr} | K/D: ${kdRatio} (${stats.kills || 0} K / ${stats.deaths || 0} D)`,
			`Tin nhắn: ${stats.messageCount || 0} | Tham gia: ${stats.joinCount || 1} lần`,
		];
	}
}
