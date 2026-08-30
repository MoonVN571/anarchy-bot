import { EmbedBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { StatsService } from "../services/StatsService";
import { formatDuration } from "../utils/timeFormat";

export class TopCommand extends Command {
	constructor() {
		super({
			name: "top",
			aliases: ["lb", "leaderboard", "bxh"],
			description: "Xem bảng xếp hạng Top 10 của server",
			usage: ">top [playtime | kills | deaths | messages]",
			inGameUsage: "!top [playtime | kills | deaths | messages]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const rawCategory = (args[0] || "playtime").toLowerCase();

		let category: "playtime" | "kills" | "deaths" | "messages" = "playtime";
		let categoryTitle = "Thời gian chơi (Playtime)";

		if (rawCategory === "kills" || rawCategory === "kill" || rawCategory === "k") {
			category = "kills";
			categoryTitle = "Kills (Hạ gục)";
		} else if (rawCategory === "deaths" || rawCategory === "death" || rawCategory === "d") {
			category = "deaths";
			categoryTitle = "Deaths (Tử vong)";
		} else if (rawCategory === "messages" || rawCategory === "msg" || rawCategory === "chat" || rawCategory === "m") {
			category = "messages";
			categoryTitle = "Tin nhắn chat (Messages)";
		}

		const leaderboard = await StatsService.getLeaderboard(serverHost, category, 10);

		if (!leaderboard || leaderboard.length === 0) {
			await message.reply({
				content: `Chưa có dữ liệu bảng xếp hạng cho server \`${serverHost}\`.`,
			});
			return;
		}

		const listLines = leaderboard.map((entry, index) => {
			let formattedScore = entry.score.toLocaleString();

			if (category === "playtime") {
				formattedScore = formatDuration(entry.score);
			}

			return `\`#${index + 1}\` **${entry.username}** — \`${formattedScore}\``;
		});

		const embed = new EmbedBuilder()
			.setColor(0xe67e22)
			.setTitle(`Bảng Xếp Hạng Top 10: ${categoryTitle}`)
			.setDescription(listLines.join("\n"))
			.setFooter({ text: `Server: ${serverHost} | Dùng >top [kills|deaths|playtime|messages]` })
			.setTimestamp();

		await message.reply({ embeds: [embed] });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const rawCategory = (ctx.args[0] || "playtime").toLowerCase();

		let category: "playtime" | "kills" | "deaths" | "messages" = "playtime";
		let label = "Playtime";

		if (rawCategory === "kills" || rawCategory === "kill" || rawCategory === "k") {
			category = "kills";
			label = "Kills";
		} else if (rawCategory === "deaths" || rawCategory === "death" || rawCategory === "d") {
			category = "deaths";
			label = "Deaths";
		} else if (rawCategory === "messages" || rawCategory === "msg" || rawCategory === "chat" || rawCategory === "m") {
			category = "messages";
			label = "Chats";
		}

		const leaderboard = await StatsService.getLeaderboard(ctx.serverHost, category, 5);

		if (!leaderboard || leaderboard.length === 0) {
			return `[Top 5 ${label}] Khong co du lieu xep hang.`;
		}

		const entriesStr = leaderboard.map((e, idx) => {
			const score = category === "playtime" ? formatDuration(e.score) : e.score.toLocaleString();
			return `#${idx + 1} ${e.username} (${score})`;
		}).join(" | ");

		return `[Top 5 ${label}] ${entriesStr}`;
	}
}
