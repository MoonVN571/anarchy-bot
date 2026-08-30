import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { StatsService } from "../services/StatsService";

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

		const embed = new EmbedBuilder()
			.setColor(0xe74c3c)
			.setAuthor({
				name: `Chỉ số K/D: ${stats.displayName || stats.username}`,
				iconURL: `https://mc-heads.net/avatar/${stats.username}/64`,
			})
			.setThumbnail(`https://mc-heads.net/avatar/${stats.username}/128`)
			.addFields(
				{ name: "Tỉ lệ K/D", value: `**${kdRatio}**`, inline: true },
				{ name: "Kills (Hạ gục)", value: `\`${kills}\``, inline: true },
				{ name: "Tổng Deaths (Tử vong)", value: `\`${deaths}\``, inline: true },
				{ name: "PvP Deaths", value: `\`${pvpDeaths}\``, inline: true },
				{ name: "Mob Deaths", value: `\`${mobDeaths}\``, inline: true },
				{ name: "Tự sát (Suicide)", value: `\`${suicides}\``, inline: true },
				{
					name: "Killstreak",
					value: `Hiện tại: **${stats.currentKillstreak || 0}** | Cao nhất: **${stats.highestKillstreak || 0}**`,
					inline: false,
				}
			)
			.setFooter({ text: `Server: ${serverHost} | anarchy-bot` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0] || ctx.sender;
		const stats = await StatsService.getPlayerStats(ctx.serverHost, targetUser);

		if (!stats) {
			return `[K/D] Khong tim thay thong ke cua player "${targetUser}".`;
		}

		const kills = stats.kills || 0;
		const deaths = stats.deaths || 0;
		const kdRatio = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
		const currStreak = stats.currentKillstreak || 0;
		const maxStreak = stats.highestKillstreak || 0;

		return `[K/D] ${stats.displayName || stats.username}: ${kills}K / ${deaths}D (K/D: ${kdRatio}) | Killstreak: ${currStreak} (Max: ${maxStreak})`;
	}
}
