import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { LotteryService } from "../../services/minecraft/LotteryService";

export class LotteryCommand extends Command {
	constructor() {
		super({
			name: "lottery",
			aliases: ["xoso", "xs", "jackpot", "quayhu", "veso"],
			description: "Tham gia mua vé số quay Hũ Jackpot 18h hàng ngày",
			usage: "!xs | !xs buy <số_vé> | !xs mua <số_vé>",
			inGameUsage: "!xs | !xs buy <số_vé> | !xs mua <số_vé>",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		await ctx.message.reply({ content: "[Thông tin] Lệnh xổ số !xs hoạt động trực tiếp trong game Minecraft." });
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string> {
		const { sender, args, serverHost } = ctx;
		const sub = (args[0] || "").toLowerCase();

		// Handle ticket purchase
		if (sub === "buy" || sub === "mua" || sub === "b") {
			const countStr = args[1] || "1";
			const count = parseInt(countStr, 10);
			if (isNaN(count) || count <= 0) {
				return "[Xổ Số] Vui lòng nhập số lượng vé hợp lệ. Ví dụ: !xs buy 5";
			}

			const res = await LotteryService.buyTickets(serverHost, sender, sender, count);
			return `[Xổ Số] ${res.message}`;
		}

		// Handle manual draw trigger (admin/special)
		if (sub === "draw" || sub === "quay") {
			const bot = ctx.bot;
			const res = await LotteryService.drawLottery(serverHost, bot);
			if (!res.drawn) {
				return `[Xổ Số] Không thể quay thưởng vì kỳ này chưa có ai mua vé! Hũ hiện tại: ${res.jackpotPool.toLocaleString("vi-VN")} xu.`;
			}
			return `[Xổ Số] Đã hoàn tất quay thưởng! Người chiến thắng: ${res.winner?.displayName} (${res.winner?.amount.toLocaleString("vi-VN")} xu).`;
		}

		// Default: Query lottery status & countdown
		const lottery = await LotteryService.getLottery(serverHost);
		const userUname = sender.toLowerCase();
		const userTicket = lottery.tickets.find(t => t.username === userUname);
		const userCount = userTicket ? userTicket.ticketCount : 0;
		const totalSold = lottery.tickets.reduce((acc, t) => acc + t.ticketCount, 0);

		const { formatted } = LotteryService.getTimeUntil18h();

		const winnerInfo = lottery.lastWinner
			? ` | Thắng kỳ trước: ${lottery.lastWinner.displayName} (+${lottery.lastWinner.amount.toLocaleString("vi-VN")} xu)`
			: "";

		return `[Xổ Số 18:00] Hũ Jackpot: ${lottery.jackpotPool.toLocaleString("vi-VN")} xu | Đã bán: ${totalSold} vé | Vé của bạn: ${userCount} vé | Quay thưởng lúc 18:00 (còn ${formatted})! (Dùng !xs buy <số_lượng> để mua)`;
	}
}
