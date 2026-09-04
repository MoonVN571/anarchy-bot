import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";

export class CoinflipCommand extends Command {
	constructor() {
		super({
			name: "coinflip",
			aliases: ["cf", "tungdongxu", "nguasap"],
			description: "Minigame tung đồng xu ngửa / sấp nhân đôi tiền cược (x2)",
			usage: "!cf <ngua|sap> <số_xu>",
			inGameUsage: "!cf <ngua|sap> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame !cf hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (args.length < 2) {
			return "[Coinflip] Cú pháp: !cf <ngua|sap> <số_xu>. Ví dụ: !cf ngua 100 hoặc !cf sap 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: "ngua" | "sap" | null = null;
		if (choiceRaw === "ngua" || choiceRaw === "n" || choiceRaw === "heads" || choiceRaw === "h") {
			choice = "ngua";
		} else if (choiceRaw === "sap" || choiceRaw === "s" || choiceRaw === "tails" || choiceRaw === "t") {
			choice = "sap";
		}

		if (!choice) {
			return "[Coinflip] Lựa chọn không hợp lệ! Vui lòng chọn 'ngua' (Ngửa) hoặc 'sap' (Sấp).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Coinflip] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Deduct bet amount first
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Coinflip] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		// Flip coin
		const result: "ngua" | "sap" = Math.random() < 0.5 ? "ngua" : "sap";
		const isWin = choice === result;
		const resultLabel = result === "ngua" ? "NGỬA" : "SẤP";

		if (isWin) {
			const wonAmount = betAmount * 2;
			const newAccount = await EconomyService.addBalance(serverHost, sender, sender, wonAmount, true);
			return `[Coinflip] Kết quả: [${resultLabel}]. CHÚC MỪNG! Bạn đã đoán đúng và nhận được +${wonAmount.toLocaleString("vi-VN")} xu (Số dư: ${newAccount.balance.toLocaleString("vi-VN")} xu).`;
		} else {
			// Record loss in stats
			await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
			return `[Coinflip] Kết quả: [${resultLabel}]. RẤT TIẾC! Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu cược (Số dư: ${deductRes.remaining.toLocaleString("vi-VN")} xu).`;
		}
	}
}
