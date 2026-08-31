import {
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { StatsService } from "../services";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { formatDuration } from "../utils";

export class TopCommand extends Command {
	constructor() {
		super({
			name: "top",
			aliases: ["lb", "leaderboard", "bxh"],
			description: "Xem bảng xếp hạng Top 10 của server",
			usage: ">top [playtime | kills | deaths | messages | kd]",
			inGameUsage: "!top [playtime | kills | deaths | messages | kd]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const rawCategory = (args[0] || "playtime").toLowerCase();

		let category: "playtime" | "kills" | "deaths" | "messages" | "kd" = "playtime";
		let categoryTitle = "Playtime (Thời gian chơi)";

		if (rawCategory === "kills" || rawCategory === "kill" || rawCategory === "k") {
			category = "kills";
			categoryTitle = "Kills (Hạ gục)";
		} else if (rawCategory === "deaths" || rawCategory === "death" || rawCategory === "d") {
			category = "deaths";
			categoryTitle = "Deaths (Số lần chết)";
		} else if (rawCategory === "messages" || rawCategory === "msg" || rawCategory === "chat" || rawCategory === "m") {
			category = "messages";
			categoryTitle = "Messages (Tin nhắn)";
		} else if (rawCategory === "kd" || rawCategory === "kda" || rawCategory === "k/d" || rawCategory === "ratio" || rawCategory === "pvp") {
			category = "kd";
			categoryTitle = "K/D Ratio (Tỉ lệ K/D)";
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
			} else if (category === "kd") {
				const extra = entry.kills !== undefined && entry.deaths !== undefined ? ` *(${entry.kills} K / ${entry.deaths} D)*` : "";
				return `\`#${index + 1}\` **${entry.username}** — \`${Number(entry.score).toFixed(2)} K/D\`${extra}`;
			}

			return `\`#${index + 1}\` **${entry.username}** — \`${formattedScore}\``;
		});

		const container = new ContainerBuilder()
			.setAccentColor(0xe67e22)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`**Bảng Xếp Hạng Top 10: ${categoryTitle}**\n\n${listLines.join("\n")}`)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`Dùng >top [playtime|kills|deaths|messages|kd]\n<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string[] | string | void> {
		const rawCategory = (ctx.args[0] || "playtime").toLowerCase();

		let category: "playtime" | "kills" | "deaths" | "messages" | "kd" = "playtime";
		let label = "Playtime";

		if (rawCategory === "kills" || rawCategory === "kill" || rawCategory === "k") {
			category = "kills";
			label = "Kills";
		} else if (rawCategory === "deaths" || rawCategory === "death" || rawCategory === "d") {
			category = "deaths";
			label = "Số lần chết";
		} else if (rawCategory === "messages" || rawCategory === "msg" || rawCategory === "chat" || rawCategory === "m") {
			category = "messages";
			label = "Tin nhắn";
		} else if (rawCategory === "kd" || rawCategory === "kda" || rawCategory === "k/d" || rawCategory === "ratio" || rawCategory === "pvp") {
			category = "kd";
			label = "Tỉ lệ K/D";
		}

		const leaderboard = await StatsService.getLeaderboard(ctx.serverHost, category, 5);

		if (!leaderboard || leaderboard.length === 0) {
			return `[Top 5 ${label}] Chưa có dữ liệu bảng xếp hạng.`;
		}

		return [
			`[Top 5 ${label}] Bảng xếp hạng máy chủ:`,
			...leaderboard.map((e, idx) => {
				let scoreStr: string;
				if (category === "playtime") {
					scoreStr = formatDuration(e.score);
				} else if (category === "kd") {
					const kdStr = Number(e.score).toFixed(2);
					scoreStr = e.kills !== undefined && e.deaths !== undefined ? `${kdStr} (${e.kills}K/${e.deaths}D)` : `${kdStr} K/D`;
				} else {
					scoreStr = e.score.toLocaleString();
				}
				return `#${idx + 1}. ${e.username}: ${scoreStr}`;
			})
		];
	}
}
