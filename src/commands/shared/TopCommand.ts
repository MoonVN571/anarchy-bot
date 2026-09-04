import {
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	TextDisplayBuilder,
} from "discord.js";
import { StatsService, EconomyService } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { formatDuration } from "../../utils";

export class TopCommand extends Command {
	constructor() {
		super({
			name: "top",
			aliases: ["lb", "leaderboard", "bxh", "rich"],
			description: "Xem các bảng xếp hạng Top của server",
			usage: ">top [bal | win | loss | work | playtime | kills | deaths | messages | kd]",
			inGameUsage: "!top [bal | win | loss | work | playtime | kills | deaths | messages | kd]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const rawCategory = (args[0] || "bal").toLowerCase();

		// Handle Economy Leaderboards for Discord
		if (
			rawCategory === "bal" ||
			rawCategory === "balance" ||
			rawCategory === "coin" ||
			rawCategory === "coins" ||
			rawCategory === "rich" ||
			rawCategory === "tien"
		) {
			const topBal = await EconomyService.getLeaderboard(serverHost, "balance", 10);
			if (!topBal || topBal.length === 0) {
				await message.reply({ content: `Chưa có dữ liệu kinh tế cho server \`${serverHost}\`.` });
				return;
			}

			const listLines = topBal.map(
				(e, idx) => `\`#${idx + 1}\` **${e.displayName || e.username}** — \`${e.balance.toLocaleString("vi-VN")} xu\``
			);

			const container = new ContainerBuilder()
				.setAccentColor(0xf1c40f)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`**Bảng Xếp Hạng Top 10: Đại Gia (Số Dư Xu)**\n\n${listLines.join("\n")}`)
				);
			await message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
			return;
		}

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
				new TextDisplayBuilder().setContent(`Dùng >top [bal|playtime|kills|deaths|messages|kd]\n<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string[] | string | void> {
		const rawCategory = (ctx.args[0] || (ctx.commandName.toLowerCase() === "rich" ? "bal" : "bal")).toLowerCase();

		if (rawCategory === "help" || rawCategory === "huongdan") {
			return "[Top] Danh mục BXH: !top bal (Đại gia) | !top win (Thắng cược) | !top loss (Thua cược) | !top work (Chăm chỉ) | !top playtime | !top kill | !top death";
		}

		// 1. Top Economy: Balance
		if (
			rawCategory === "bal" ||
			rawCategory === "balance" ||
			rawCategory === "coin" ||
			rawCategory === "coins" ||
			rawCategory === "rich" ||
			rawCategory === "tien"
		) {
			const top = await EconomyService.getLeaderboard(ctx.serverHost, "balance", 5);
			if (top.length === 0) return "[Top 5 Đại Gia] Chưa có dữ liệu số dư.";
			const lines = top.map((e, idx) => `#${idx + 1}. ${e.displayName || e.username} (${e.balance.toLocaleString("vi-VN")} xu)`);
			return `[Top 5 Đại Gia] ${lines.join(" | ")}`;
		}

		// 2. Top Economy: Win
		if (rawCategory === "win" || rawCategory === "thang" || rawCategory === "thangcuoc") {
			const top = await EconomyService.getLeaderboard(ctx.serverHost, "won", 5);
			if (top.length === 0) return "[Top 5 Thắng Cược] Chưa có dữ liệu.";
			const lines = top.map((e, idx) => `#${idx + 1}. ${e.displayName || e.username} (+${e.totalWon.toLocaleString("vi-VN")} xu)`);
			return `[Top 5 Thắng Cược] ${lines.join(" | ")}`;
		}

		// 3. Top Economy: Loss
		if (rawCategory === "loss" || rawCategory === "thua" || rawCategory === "den") {
			const top = await EconomyService.getLeaderboard(ctx.serverHost, "lost", 5);
			if (top.length === 0) return "[Top 5 Thua Cược] Chưa có dữ liệu.";
			const lines = top.map((e, idx) => `#${idx + 1}. ${e.displayName || e.username} (-${e.totalLost.toLocaleString("vi-VN")} xu)`);
			return `[Top 5 Thua Cược] ${lines.join(" | ")}`;
		}

		// 4. Top Economy: Work
		if (rawCategory === "work" || rawCategory === "chamchi" || rawCategory === "lamviec") {
			const top = await EconomyService.getLeaderboard(ctx.serverHost, "work", 5);
			if (top.length === 0) return "[Top 5 Chăm Chỉ] Chưa có dữ liệu.";
			const lines = top.map((e, idx) => `#${idx + 1}. ${e.displayName || e.username} (${e.workCount || 0} lần)`);
			return `[Top 5 Chăm Chỉ] ${lines.join(" | ")}`;
		}

		// 5. Server Stats Leaderboards
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

		const lines = leaderboard.map((e, idx) => {
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
		});

		return `[Top 5 ${label}] ${lines.join(" | ")}`;
	}
}

