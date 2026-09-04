import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { isDevMinecraftUser } from "../../config/appConfig";

export class SubCoinCommand extends Command {
	constructor() {
		super({
			name: "subcoin",
			aliases: ["takecoin", "truxu", "trutien", "removecoin"],
			description: "Trừ xu của người chơi (Dành riêng cho Dev)",
			usage: "!subcoin <player> <số xu>",
			inGameUsage: "!subcoin <player> <số xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !subcoin chỉ dành cho Developer trong game." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (!isDevMinecraftUser(sender)) {
			return "[Lỗi] Bạn không có quyền thực hiện lệnh này (Chỉ dành cho Dev)!";
		}

		const target = args[0];
		const amountRaw = args[1];

		if (!target || !amountRaw) {
			return "[Admin] Cú pháp: !subcoin <player> <số xu>. Ví dụ: !subcoin MoonVN 5000";
		}

		const amount = parseInt(amountRaw.replace(/[,._]/g, ""), 10);
		if (isNaN(amount) || amount <= 0) {
			return "[Admin] Số xu cần trừ phải là số nguyên dương hợp lệ!";
		}

		const res = await EconomyService.deductBalanceDirect(serverHost, target, target, amount);
		return `[Admin] Đã trừ ${res.deducted.toLocaleString("vi-VN")} xu từ ${target}. Số dư còn lại: ${res.account.balance.toLocaleString("vi-VN")} xu.`;
	}
}
