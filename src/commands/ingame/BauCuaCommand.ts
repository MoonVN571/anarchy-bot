import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { EconomyService } from "../../services/minecraft/EconomyService";

export class BauCuaCommand extends Command {
	private static readonly MASCOTS: { [key: string]: string } = {
		bau: "Bầu",
		cua: "Cua",
		tom: "Tôm",
		ca: "Cá",
		ga: "Gà",
		nai: "Nai",
	};

	constructor() {
		super({
			name: "baucua",
			aliases: ["bc", "baucuatomca"],
			description: "Minigame Bầu Cua Tôm Cá truyền thống Việt Nam (6 linh vật)",
			usage: "!bc <bau|cua|tom|ca|ga|nai> <số_xu>",
			inGameUsage: "!bc <bau|cua|tom|ca|ga|nai> <số_xu>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Minigame Bầu Cua !bc hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;

		if (args.length < 2) {
			return "[Bầu Cua] Cú pháp: !bc <bau|cua|tom|ca|ga|nai> <số_xu>. Ví dụ: !bc cua 100 hoặc !bc tom 50";
		}

		const choiceRaw = args[0].toLowerCase();
		let choice: string | null = null;

		if (choiceRaw.startsWith("b")) choice = "bau";
		else if (choiceRaw.startsWith("cu")) choice = "cua";
		else if (choiceRaw.startsWith("t")) choice = "tom";
		else if (choiceRaw.startsWith("ca")) choice = "ca";
		else if (choiceRaw.startsWith("g")) choice = "ga";
		else if (choiceRaw.startsWith("n")) choice = "nai";

		if (!choice || !BauCuaCommand.MASCOTS[choice]) {
			return "[Bầu Cua] Linh vật không hợp lệ! Vui lòng chọn một trong: bau (Bầu), cua (Cua), tom (Tôm), ca (Cá), ga (Gà), nai (Nai).";
		}

		const betAmount = parseInt(args[1], 10);
		if (isNaN(betAmount) || betAmount <= 0) {
			return "[Bầu Cua] Số tiền cược phải là số nguyên dương lớn hơn 0!";
		}

		// Deduct bet amount
		const deductRes = await EconomyService.deductBalance(serverHost, sender, sender, betAmount, false);
		if (!deductRes.success) {
			return `[Bầu Cua] Số dư không đủ! Bạn chỉ có ${deductRes.remaining.toLocaleString("vi-VN")} xu.`;
		}

		// Roll 3 dice (choose 3 random mascots from list)
		const mascotKeys = Object.keys(BauCuaCommand.MASCOTS);
		const r1 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];
		const r2 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];
		const r3 = mascotKeys[Math.floor(Math.random() * mascotKeys.length)];

		const rollDisplay = `[${BauCuaCommand.MASCOTS[r1]} - ${BauCuaCommand.MASCOTS[r2]} - ${BauCuaCommand.MASCOTS[r3]}]`;

		// Count matches
		const matchCount = [r1, r2, r3].filter(k => k === choice).length;
		const chosenLabel = BauCuaCommand.MASCOTS[choice];

		if (matchCount > 0) {
			// Won: Refund bet + matchCount * bet
			const payout = betAmount + matchCount * betAmount;
			const profit = matchCount * betAmount;
			const newAccount = await EconomyService.addBalance(serverHost, sender, sender, payout, true);
			return `[Bầu Cua] Mở bát: ${rollDisplay}. CHÚC MỪNG! Trúng ${matchCount} con ${chosenLabel} -> Nhận lại vốn + thưởng ${profit.toLocaleString("vi-VN")} xu (Tổng nhận: +${payout.toLocaleString("vi-VN")} xu, Số dư: ${newAccount.balance.toLocaleString("vi-VN")} xu).`;
		} else {
			await EconomyService.deductBalance(serverHost, sender, sender, 0, true);
			return `[Bầu Cua] Mở bát: ${rollDisplay}. KHÔNG TRÚNG! Không có con ${chosenLabel} nào. Bạn đã thua -${betAmount.toLocaleString("vi-VN")} xu (Số dư: ${deductRes.remaining.toLocaleString("vi-VN")} xu).`;
		}
	}
}
