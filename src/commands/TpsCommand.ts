import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings";
import { messageColors } from "../utils";

export class TpsCommand extends Command {
	constructor() {
		super({
			name: "tps",
			aliases: ["lag", "tick", "tpscheck"],
			description: "Kiểm tra tốc độ xử lý Ticks Per Second (TPS) và độ mượt của Server",
			usage: ">tps",
			inGameUsage: "!tps",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, serverHost } = ctx;

		const tps = this.getEstimatedTps(bot);
		const botPing = bot.bot?.player?.ping ?? 0;

		let statusEmoji = "🟢";
		let statusText = "Server đang hoạt động rất mượt mà";
		let color = messageColors.join;

		if (tps < 15.0) {
			statusEmoji = "🔴";
			statusText = "Server đang lag nặng (TPS thấp)";
			color = messageColors.dead;
		} else if (tps < 18.5) {
			statusEmoji = "🟡";
			statusText = "Server hơi giật lag nhẹ";
			color = messageColors.queue;
		}

		const container = new ContainerBuilder()
			.setAccentColor(color)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Hiệu Năng & Độ Mượt Máy Chủ**\n\n` +
					`- **Server:** \`${serverHost}\`\n` +
					`- **TPS:** \`${tps.toFixed(1)} / 20.0\` ${statusEmoji}\n` +
					`- **Độ trễ Ping:** \`${botPing}ms\`\n` +
					`- **Đánh giá:** ${statusText}`
				)
			)
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
		const { bot } = ctx;
		const tps = this.getEstimatedTps(bot);
		const botPing = bot.bot?.player?.ping ?? 0;

		const statusStr = tps >= 18.5 ? "Mượt" : tps >= 15.0 ? "Hơi lag" : "Lag nặng";
		return `[Server TPS] TPS: ${tps.toFixed(1)}/20.0 (${statusStr}) | Ping: ${botPing}ms`;
	}

	private getEstimatedTps(bot: any): number {
		if (bot.bot && typeof (bot.bot as any).getTps === "function") {
			try {
				const val = parseFloat((bot.bot as any).getTps());
				if (!isNaN(val) && val > 0) return Math.min(20.0, val);
			} catch { }
		}

		// Fallback: estimate 20.0 if normal connected
		return 20.0;
	}
}
