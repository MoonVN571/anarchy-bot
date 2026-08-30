import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { StatsService } from "../services/StatsService";
import { formatDuration, formatTimeAgo } from "../utils/timeFormat";

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

		const embed = new EmbedBuilder()
			.setColor(0x3498db)
			.setAuthor({
				name: `Thời gian chơi: ${stats.displayName || stats.username}`,
				iconURL: `https://mc-heads.net/avatar/${stats.username}/64`,
			})
			.setThumbnail(`https://mc-heads.net/avatar/${stats.username}/128`)
			.addFields(
				{ name: "Tổng Playtime", value: `**${formatDuration(stats.playtime || 0)}**`, inline: false },
				{ name: "Trạng thái", value: stats.isOnline ? "**Đang Online**" : "**Offline**", inline: true },
				{ name: "Số lần kết nối", value: `\`${stats.joinCount || 1}\` lần`, inline: true },
				{ name: "Ngày đầu tiên", value: stats.firstSeen ? formatTimeAgo(stats.firstSeen) : "N/A", inline: true },
				{ name: "Hoạt động gần nhất", value: stats.lastSeen ? formatTimeAgo(stats.lastSeen) : "N/A", inline: true }
			)
			.setFooter({ text: `Server: ${serverHost} | anarchy-bot` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[Playtime] Khong tim thay du lieu cua player "${targetUser}".`;
		}

		const ptStr = formatDuration(stats.playtime || 0);
		const status = stats.isOnline ? "Online" : "Offline";

		return `[Playtime] ${stats.displayName || stats.username} (${status}): ${ptStr} | Joins: ${stats.joinCount || 1}`;
	}
}
