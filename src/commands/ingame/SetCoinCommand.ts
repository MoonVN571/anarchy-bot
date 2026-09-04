import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { isDevMinecraftUser } from "../../config/appConfig";

export class SetCoinCommand extends Command {
	constructor() {
		super({
			name: "setcoin",
			aliases: ["datxu", "settien"],
			description: "Thiết lập số dư xu cho người chơi (Dành riêng cho Dev)",
			usage: "!setcoin <player> <số xu>",
			inGameUsage: "!setcoin <player> <số xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !setcoin chỉ dành cho Developer trong game." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (!isDevMinecraftUser(sender)) {
			return "[Lỗi] Bạn không có quyền thực hiện lệnh này (Chỉ dành cho Dev)!";
		}

		const target = args[0];
		const amountRaw = args[1];

		if (!target || amountRaw === undefined) {
			return "[Admin] Cú pháp: !setcoin <player> <số xu>. Ví dụ: !setcoin MoonVN 50000";
		}

		const amount = parseInt(amountRaw.replace(/[,._]/g, ""), 10);
		if (isNaN(amount) || amount < 0) {
			return "[Admin] Số xu phải là số nguyên không âm hợp lệ!";
		}

		const account = await EconomyService.setBalance(serverHost, target, target, amount);
		return `[Admin] Đã thiết lập số dư của ${target} thành ${account.balance.toLocaleString("vi-VN")} xu.`;
	}
}
