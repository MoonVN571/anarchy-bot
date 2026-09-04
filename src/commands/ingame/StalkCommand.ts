import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { StalkService } from "../../services/minecraft/StalkService";

export class StalkCommand extends Command {
	constructor() {
		super({
			name: "stalk",
			aliases: ["watch", "theodoi", "unstalk"],
			description: "Đăng ký nhận whisper thông báo khi một người chơi online hoặc offline",
			usage: "!stalk <player> | !unstalk <player> | !stalk list",
			inGameUsage: "!stalk <player> | !unstalk <player> | !stalk list",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !stalk hoạt động trực tiếp trong game Minecraft qua whisper." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { bot, sender, args, serverHost, commandName } = ctx;
		const sub = (args[0] || "").toLowerCase();

		// Handle unstalk via direct alias "!unstalk"
		if (commandName.toLowerCase() === "unstalk") {
			if (!args[0]) {
				return "[Stalk] Cú pháp: !unstalk <tên_player>";
			}
			const res = await StalkService.removeStalk(serverHost, sender, args[0]);
			return `[Stalk] ${res.message}`;
		}

		if (!sub || sub === "help") {
			return "[Stalk] Cú pháp: !stalk <tên_player> (Theo dõi) | !unstalk <tên_player> (Hủy) | !stalk list (Xem danh sách)";
		}

		if (sub === "list" || sub === "ds") {
			const stalks = await StalkService.getStalkList(serverHost, sender);
			if (stalks.length === 0) {
				return "[Stalk] Bạn hiện chưa theo dõi người chơi nào. Dùng !stalk <tên_player> để theo dõi.";
			}
			const targets = stalks.map(s => s.targetDisplayName || s.target).join(", ");
			return `[Stalk] Danh sách đang theo dõi (${stalks.length}/${StalkService.MAX_STALKS_PER_PLAYER}): ${targets}`;
		}

		if (sub === "remove" || sub === "del" || sub === "xoa") {
			const target = args[1];
			if (!target) return "[Stalk] Cú pháp: !stalk del <tên_player>";
			const res = await StalkService.removeStalk(serverHost, sender, target);
			return `[Stalk] ${res.message}`;
		}

		// Add stalk target
		const targetPlayer = args[0];
		const res = await StalkService.addStalk(serverHost, sender, sender, targetPlayer, targetPlayer);
		return `[Stalk] ${res.message}`;
	}
}
