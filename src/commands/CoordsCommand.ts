import { AttachmentBuilder } from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { CanvasRendererService } from "../services/CanvasRendererService";

export class CoordsCommand extends Command {
	constructor() {
		super({
			name: "coords",
			aliases: ["pos", "vitri", "toado"],
			description: "Xem tọa độ, máu, thức ăn và trạng thái hiện tại của Bot",
			usage: ">coords hoặc >pos",
			inGameUsage: "!coords hoặc !pos",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot } = ctx;

		if (!bot || !bot.bot) {
			await message.reply({ content: "⚠️ Bot hiện chưa được kết nối vào server." });
			return;
		}

		try {
			const imageBuffer = await CanvasRendererService.renderCoordinates(bot);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "bot-coords.png" });

			await message.reply({
				files: [attachment],
			});
		} catch (error) {
			ctx.client.logger.error(`[CoordsCommand] Error rendering coordinates: ${error}`);
			await message.reply({ content: "❌ Đã xảy ra lỗi khi tạo ảnh tọa độ của bot." });
		}
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const bot = ctx.bot.bot;
		const pos = bot?.entity?.position;
		if (!pos) {
			return "[Vị trí] Bot chưa nhận được tọa độ từ máy chủ.";
		}

		const x = Math.round(pos.x);
		const y = Math.round(pos.y);
		const z = Math.round(pos.z);
		const rawDim = (bot?.game?.dimension as any) || "overworld";
		const dimName = rawDim.includes("nether") ? "Nether" : rawDim.includes("end") ? "The End" : "Overworld";

		return `[Vị trí] Tọa độ Bot: X: ${x}, Y: ${y}, Z: ${z} (${dimName}) | Máu: ${Math.round(bot.health || 20)}/20 | Đói: ${Math.round(bot.food || 20)}/20`;
	}
}
