import { AttachmentBuilder } from "discord.js";
import { CanvasRendererService, viewerManager } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";

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
			await message.reply({ content: "[Cảnh báo] Bot hiện chưa được kết nối vào server." });
			return;
		}

		try {
			const imageBuffer = await CanvasRendererService.renderCoordinates(bot);
			const attachment = new AttachmentBuilder(imageBuffer, { name: "bot-coords.png" });
			const viewerUrl = process.env.VIEWER_ENABLED !== "false"
				? viewerManager.getViewerUrl(bot.config.id)
				: undefined;

			await message.reply({
				content: viewerUrl ? `**3D Map Viewer**: <${viewerUrl}>` : undefined,
				files: [attachment],
			});
		} catch (error) {
			ctx.client.logger.error(`[CoordsCommand] Error rendering coordinates: ${error}`);
			await message.reply({ content: "[Lỗi] Đã xảy ra lỗi khi tạo ảnh tọa độ của bot." });
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
		const cx = Math.floor(x / 16);
		const cz = Math.floor(z / 16);
		const rawDim = (bot?.game?.dimension as any) || "overworld";
		const dimName = rawDim.includes("nether") ? "Nether" : rawDim.includes("end") ? "The End" : "Overworld";

		return `[Vị trí] X: ${x}, Y: ${y}, Z: ${z} | Chunk: [${cx}, ${cz}] (${dimName}) | Máu: ${Math.round(bot.health || 20)}/20 | Đói: ${Math.round(bot.food || 20)}/20`;
	}
}
