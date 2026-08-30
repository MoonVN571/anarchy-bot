import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { StatsService } from "../services/StatsService";
import { formatDuration, formatTimeAgo } from "../utils/timeFormat";

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

		const embed = new EmbedBuilder()
			.setColor(stats.isOnline ? 0x2ecc71 : 0x95a5a6)
			.setAuthor({
				name: `Hồ sơ: ${stats.displayName || stats.username} ${stats.isOnline ? "(Online)" : "(Offline)"}`,
				iconURL: `https://mc-heads.net/avatar/${stats.username}/64`,
			})
			.setThumbnail(`https://mc-heads.net/avatar/${stats.username}/128`)
			.addFields(
				{ name: "Thời gian chơi (Playtime)", value: `**${formatDuration(stats.playtime || 0)}**`, inline: false },
				{ name: "K/D", value: `\`${kdRatio}\` (${stats.kills || 0}K / ${stats.deaths || 0}D)`, inline: true },
				{ name: "Tin nhắn chat", value: `\`${(stats.messageCount || 0).toLocaleString()}\``, inline: true },
				{ name: "Số lần tham gia", value: `\`${(stats.joinCount || 1).toLocaleString()}\``, inline: true },
				{ name: "Lần đầu vào server", value: stats.firstSeen ? formatTimeAgo(stats.firstSeen) : "N/A", inline: true },
				{ name: "Lần cuối online", value: stats.lastSeen ? formatTimeAgo(stats.lastSeen) : "N/A", inline: true }
			)
			.setFooter({ text: `Server: ${serverHost} | anarchy-bot` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[Stats] Khong tim thay thong ke cua player "${targetUser}".`;
		}

		const kdRatio = (stats.deaths || 0) > 0
			? ((stats.kills || 0) / stats.deaths).toFixed(2)
			: (stats.kills || 0).toFixed(2);
		const ptStr = formatDuration(stats.playtime || 0);
		const status = stats.isOnline ? "Online" : "Offline";

		return `[Stats] ${stats.displayName || stats.username} (${status}): Playtime: ${ptStr} | K/D: ${kdRatio} (${stats.kills || 0}K/${stats.deaths || 0}D) | Chats: ${stats.messageCount || 0}`;
	}
}
