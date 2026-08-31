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

export class PlaytimeCommand extends Command {
	constructor() {
		super({
			name: "playtime",
			aliases: ["pt", "online-time"],
			description: "Xem chi tiết thời gian online của người chơi",
			usage: ">playtime <tên_người_chơi>",
			inGameUsage: "!playtime [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		if (!targetUser) {
			await message.reply({
				content: `Cú pháp: \`${this.usage}\` (Ví dụ: \`>playtime MoonVN\`)`,
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

		const username = stats.displayName || stats.username;
		const headUrl = `https://mc-heads.net/avatar/${stats.username}/128.png`;
		const statusText = stats.isOnline ? "Online" : "Offline";

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Playtime: ${username}**\n` +
					`- Tổng Playtime: **${formatDuration(stats.playtime || 0)}**\n` +
					`- Trạng thái: **${statusText}** | Số lần kết nối: **${stats.joinCount || 1}**\n` +
					`- Ngày đầu tiên: ${stats.firstSeen ? formatTimeAgo(stats.firstSeen) : "N/A"}\n` +
					`- Hoạt động gần nhất: ${stats.lastSeen ? formatTimeAgo(stats.lastSeen) : "N/A"}`
				)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
			);

		const container = new ContainerBuilder()
			.setAccentColor(0x3498db)
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

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[Playtime] Không tìm thấy dữ liệu của người chơi "${targetUser}".`;
		}

		const ptStr = formatDuration(stats.playtime || 0);
		const status = stats.isOnline ? "Online" : "Offline";

		return `[Playtime] ${stats.displayName || stats.username} (${status}): ${ptStr} | Số lần vào: ${stats.joinCount || 1}`;
	}
}
