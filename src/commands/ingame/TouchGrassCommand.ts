import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { PlayerModel } from "../../database/models/PlayerModel";

export class TouchGrassCommand extends Command {
	constructor() {
		super({
			name: "grass",
			aliases: ["touchgrass", "chamco", "suckhoe", "healthwarning"],
			description: "Bật hoặc tắt lời nhắc nhở 'chạm cỏ' khi cày liên tục 2 tiếng",
			usage: "!grass <on|off>",
			inGameUsage: "!grass <on|off>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !grass on/off được dùng trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const action = (ctx.args[0] || "").toLowerCase();
		const server = ctx.serverHost;
		const username = ctx.sender.toLowerCase();

		if (action === "off" || action === "tat" || action === "disable") {
			await PlayerModel.updateOne(
				{ server, username },
				{ $set: { healthWarning: false } },
				{ upsert: true }
			);
			return "[Nhắc nhở] Đã TẮT cảnh báo online liên tục / chạm cỏ cho bạn. (Dùng !grass on để bật lại bất kỳ lúc nào)";
		}

		if (action === "on" || action === "bat" || action === "enable") {
			await PlayerModel.updateOne(
				{ server, username },
				{ $set: { healthWarning: true } },
				{ upsert: true }
			);
			return "[Nhắc nhở] Đã BẬT cảnh báo online liên tục cho bạn. Bot sẽ nhắc nhở sau mỗi 2 tiếng cày game!";
		}

		// Check current status if no arg
		const player = await PlayerModel.findOne({ server, username });
		const isEnabled = player?.healthWarning !== false;
		return `[Nhắc nhở] Trạng thái cảnh báo sức khỏe của bạn: ${isEnabled ? "ĐANG BẬT" : "ĐANG TẮT"}. Dùng !grass on hoặc !grass off để thay đổi.`;
	}
}
