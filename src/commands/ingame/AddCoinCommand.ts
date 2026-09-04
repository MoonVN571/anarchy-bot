import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";
import { isDevMinecraftUser } from "../../config/appConfig";

export class AddCoinCommand extends Command {
	constructor() {
		super({
			name: "addcoin",
			aliases: ["givecoin", "themxu", "congtien"],
			description: "Cộng xu cho người chơi (Dành riêng cho Dev)",
			usage: "!addcoin <player> <số xu>",
			inGameUsage: "!addcoin <player> <số xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !addcoin chỉ dành cho Developer trong game." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (!isDevMinecraftUser(sender)) {
			return "[Lỗi] Bạn không có quyền thực hiện lệnh này (Chỉ dành cho Dev)!";
		}

		const target = args[0];
		const amountRaw = args[1];

		if (!target || !amountRaw) {
			return "[Admin] Cú pháp: !addcoin <player> <số xu>. Ví dụ: !addcoin MoonVN 10000";
		}

		const amount = parseInt(amountRaw.replace(/[,._]/g, ""), 10);
		if (isNaN(amount) || amount <= 0) {
			return "[Admin] Số xu thêm vào phải là số nguyên dương hợp lệ!";
		}

		const account = await EconomyService.addBalance(serverHost, target, target, amount, false);
		return `[Admin] Đã cộng thành công ${amount.toLocaleString("vi-VN")} xu cho ${target}. Số dư mới: ${account.balance.toLocaleString("vi-VN")} xu.`;
	}
}
