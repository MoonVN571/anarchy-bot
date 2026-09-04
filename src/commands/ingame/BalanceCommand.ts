import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";

export class BalanceCommand extends Command {
	constructor() {
		super({
			name: "balance",
			aliases: ["bal", "coin", "coins", "sodu", "tien", "pay", "chuyenkhoan"],
			description: "Xem số dư xu cá nhân hoặc chuyển xu cho người chơi khác",
			usage: "!bal [player] | !pay <player> <số_xu>",
			inGameUsage: "!bal [player] | !pay <player> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh !bal và !pay hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost, commandName } = ctx;
		const cmd = commandName.toLowerCase();

		// Handle payment via !pay
		if (cmd === "pay" || cmd === "chuyenkhoan" || (args[0] && args[0].toLowerCase() === "pay")) {
			const targetPlayer = cmd === "pay" || cmd === "chuyenkhoan" ? args[0] : args[1];
			const amountStr = cmd === "pay" || cmd === "chuyenkhoan" ? args[1] : args[2];

			if (!targetPlayer || !amountStr) {
				return "[Kinh Tế] Cú pháp chuyển xu: !pay <tên_player> <số_xu>. Ví dụ: !pay Steve 100";
			}

			const amount = parseInt(amountStr, 10);
			if (isNaN(amount) || amount <= 0) {
				return "[Kinh Tế] Số xu chuyển phải là số nguyên dương hợp lệ!";
			}

			const res = await EconomyService.transfer(serverHost, sender, sender, targetPlayer, targetPlayer, amount);
			if (!res.success) {
				return `[Kinh Tế] ${res.message}`;
			}

			return `[Kinh Tế] ${res.message} (Số dư còn lại: ${(res.senderBalance || 0).toLocaleString("vi-VN")} xu)`;
		}

		// Target player check (default self)
		const targetPlayer = args[0] ? args[0] : sender;
		const { account, isNewUser } = await EconomyService.getAccount(serverHost, targetPlayer, targetPlayer);

		const isSelf = targetPlayer.toLowerCase() === sender.toLowerCase();
		const starterNotice = (isSelf && isNewUser)
			? ` (Đã nhận ${EconomyService.INITIAL_STARTER_COINS} xu khởi nghiệp tân thủ!)`
			: "";

		const nameLabel = isSelf ? "Số dư của bạn" : `Số dư của ${account.displayName || targetPlayer}`;
		return `[Kinh Tế] ${nameLabel}: ${account.balance.toLocaleString("vi-VN")} xu | Thắng cược: ${account.totalWon.toLocaleString("vi-VN")} xu | Đã làm việc: ${account.workCount || 0} lần.${starterNotice}`;
	}
}
