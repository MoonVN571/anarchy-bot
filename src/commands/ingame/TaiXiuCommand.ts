import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";

export class TaiXiuCommand extends Command {
	constructor() {
		super({
			name: "taixiu",
			aliases: ["tx", "xidach"],
			description: "Minigame Tài Xỉu 3 xúc xắc truyền thống Việt Nam",
			usage: "!tx <tai|xiu> <số_xu>",
			inGameUsage: "!tx <tai|xiu> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame Tài Xỉu !tx hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (args.length < 2) {
			return "[Tài Xỉu] Cú pháp: !tx <tai|xiu> <số_xu>. Ví dụ: !tx tai 100 hoặc !tx xiu 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: "tai" | "xiu" | null = null;
		if (choiceRaw === "tai" || choiceRaw === "t" || choiceRaw === "over") {
			choice = "tai";
		} else if (choiceRaw === "xiu" || choiceRaw === "x" || choiceRaw === "under") {
			choice = "xiu";
		}

		if (!choice) {
			return "[Tài Xỉu] Lựa chọn không hợp lệ! Vui lòng chọn 'tai' (Tài: 11-17) hoặc 'xiu' (Xỉu: 4-10).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Tài Xỉu] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Deduct bet amount
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Tài Xỉu] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		// Roll 3 dice
		const d1 = Math.floor(Math.random() * 6) + 1;
		const d2 = Math.floor(Math.random() * 6) + 1;
		const d3 = Math.floor(Math.random() * 6) + 1;
		const total = d1 + d2 + d3;
		const isBao = d1 === d2 && d2 === d3;

		const diceStr = `[${d1} - ${d2} - ${d3}] (Tổng: ${total})`;

		// Check Bao (Triple)
		if (isBao) {
			await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
			return `[Tài Xỉu] Xúc xắc: ${diceStr} -> RA BÃO (Bộ ba đồng nhất)! Nhà cái ăn hết. Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu.`;
		}

		const outcome = total >= 11 ? "tai" : "xiu";
		const outcomeLabel = outcome === "tai" ? "TÀI" : "XỈU";
		const isWin = choice === outcome;

		if (isWin) {
			const wonAmount = betAmount * 2;
			const newAccount = await EconomyService.addBalance(serverHost, sender, sender, wonAmount, true);
			return `[Tài Xỉu] Xúc xắc: ${diceStr} -> Kết quả: [${outcomeLabel}]. THẮNG LỚN! Bạn nhận được +${wonAmount.toLocaleString("vi-VN")} xu (Số dư: ${newAccount.balance.toLocaleString("vi-VN")} xu).`;
		} else {
			await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
			return `[Tài Xỉu] Xúc xắc: ${diceStr} -> Kết quả: [${outcomeLabel}]. RẤT TIẾC! Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu (Số dư: ${deductRes.remaining.toLocaleString("vi-VN")} xu).`;
		}
	}
}
