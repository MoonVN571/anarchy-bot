import { AttachmentBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { CanvasRendererService } from "../services/CanvasRendererService";

export class TablistCommand extends Command {
	constructor() {
		super({
			name: "tablist",
			aliases: ["tab", "players", "list"],
			description: "Xem danh sách Tablist người chơi online, ping và avatar trên máy chủ",
			usage: ">tablist hoặc >tab",
			inGameUsage: "!tablist hoặc !tab",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Bot hiện chưa được kết nối vào server." });
			return;
		}

		try {
			const imageBuffer = await CanvasRendererService.renderTablist(bot);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "server-tablist.png" });

			const playerCount = bot.bot.players ? Object.keys(bot.bot.players).length : 0;
			await message.reply({
				content: `👥 **Tablist máy chủ ${bot.config.connection.host}** (${playerCount} người chơi online):`,
				files: [attachment],
			});
		} catch (error) {
			ctx.client.logger.error(`[TablistCommand] Error rendering tablist: ${error}`);
			await message.reply({ content: "❌ Đã xảy ra lỗi khi tạo ảnh Tablist." });
		}
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const bot = ctx.bot.bot;
		if (!bot || !bot.players) {
			return "[Tablist] Không thể đọc danh sách người chơi.";
		}

		const players = Object.keys(bot.players);
		const count = players.length;
		const sample = players.slice(0, 10).join(", ");
		const extra = count > 10 ? ` và ${count - 10} người khác...` : "";

		return `[Tablist] Online (${count}): ${sample}${extra}`;
	}
}
