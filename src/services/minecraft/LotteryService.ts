import { LotteryModel, ILottery } from "../../database/models/LotteryModel";
import { EconomyService } from "./EconomyService";
import { Minecraft } from "../../structures";
import { ChatPriority } from "./ChatQueueService";

export class LotteryService {
	public static readonly TICKET_PRICE = 50;
	public static readonly INITIAL_JACKPOT = 1000;
	public static readonly JACKPOT_CONTRIBUTION_RATE = 0.8; // 80%

	private static dailyDrawTimer: NodeJS.Timeout | null = null;
	private static lastDrawDateStr = "";

	/**
	 * Get or create current active lottery for server
	 */
	public static async getLottery(server: string): Promise<ILottery> {
		const s = server.toLowerCase().trim();
		let lottery = await LotteryModel.findOne({ server: s });

		if (!lottery) {
			lottery = await LotteryModel.create({
				server: s,
				round: 1,
				jackpotPool: this.INITIAL_JACKPOT,
				ticketPrice: this.TICKET_PRICE,
				tickets: [],
			});
		}

		return lottery;
	}

	/**
	 * Buy lottery tickets
	 */
	public static async buyTickets(
		server: string,
		username: string,
		displayName: string,
		count: number
	): Promise<{
		success: boolean;
		message: string;
		ticketCount?: number;
		totalUserTickets?: number;
		jackpotPool?: number;
		cost?: number;
	}> {
		if (count <= 0 || !Number.isInteger(count)) {
			return { success: false, message: "Số lượng vé mua phải là số nguyên dương!" };
		}

		const totalCost = count * this.TICKET_PRICE;
		const deductRes = await EconomyService.deductBalance(server, username, displayName, totalCost, false);

		if (!deductRes.success) {
			return {
				success: false,
				message: `Số dư không đủ! Cần ${totalCost.toLocaleString("vi-VN")} xu để mua ${count} vé (bạn có ${deductRes.remaining.toLocaleString("vi-VN")} xu).`,
			};
		}

		const lottery = await this.getLottery(server);
		const jackpotAddition = Math.floor(totalCost * this.JACKPOT_CONTRIBUTION_RATE);
		lottery.jackpotPool += jackpotAddition;

		const uname = username.toLowerCase().trim();
		const existingTicket = lottery.tickets.find(t => t.username === uname);

		if (existingTicket) {
			existingTicket.ticketCount += count;
			existingTicket.displayName = displayName;
		} else {
			lottery.tickets.push({
				username: uname,
				displayName,
				ticketCount: count,
			});
		}

		await lottery.save();

		const totalUserTickets = existingTicket ? existingTicket.ticketCount : count;

		return {
			success: true,
			message: `Mua thành công ${count} vé số! (Tổng sở hữu: ${totalUserTickets} vé). Hũ Jackpot hiện tại: ${lottery.jackpotPool.toLocaleString("vi-VN")} xu.`,
			ticketCount: count,
			totalUserTickets,
			jackpotPool: lottery.jackpotPool,
			cost: totalCost,
		};
	}

	/**
	 * Calculate remaining time until next 18:00 (Asia/Ho_Chi_Minh / UTC+7)
	 */
	public static getTimeUntil18h(): { hours: number; minutes: number; seconds: number; formatted: string } {
		// Current time in UTC+7
		const now = new Date();
		const vnOffsetMs = 7 * 60 * 60 * 1000;
		const vnNow = new Date(now.getTime() + vnOffsetMs);

		const target = new Date(vnNow);
		target.setUTCHours(18, 0, 0, 0);

		if (vnNow.getUTCHours() >= 18) {
			// If past 18:00 today, target is 18:00 tomorrow
			target.setUTCDate(target.getUTCDate() + 1);
		}

		const diffMs = target.getTime() - vnNow.getTime();
		const diffSec = Math.max(0, Math.floor(diffMs / 1000));
		const hours = Math.floor(diffSec / 3600);
		const minutes = Math.floor((diffSec % 3600) / 60);
		const seconds = diffSec % 60;

		const formatted = `${hours}h ${minutes}p`;
		return { hours, minutes, seconds, formatted };
	}

	/**
	 * Perform the lottery draw (scheduled daily at 18:00 or triggered)
	 */
	public static async drawLottery(
		server: string,
		bot?: Minecraft
	): Promise<{
		drawn: boolean;
		winner?: { username: string; displayName: string; amount: number };
		jackpotPool: number;
		totalTickets: number;
	}> {
		const lottery = await this.getLottery(server);
		const totalTickets = lottery.tickets.reduce((acc, t) => acc + t.ticketCount, 0);

		if (totalTickets === 0 || lottery.tickets.length === 0) {
			// Roll-over: jackpot is kept for next day
			if (bot && bot.joined) {
				bot.chatQueue.send(
					`[Xổ Số 18:00] Kỳ #${lottery.round} không có người mua vé. Hũ thưởng ${lottery.jackpotPool.toLocaleString("vi-VN")} xu được dồn sang ngày mai!`,
					ChatPriority.NORMAL
				);
			}
			return { drawn: false, jackpotPool: lottery.jackpotPool, totalTickets: 0 };
		}

		// Weighted random selection
		const ticketPool: { username: string; displayName: string }[] = [];
		for (const t of lottery.tickets) {
			for (let i = 0; i < t.ticketCount; i++) {
				ticketPool.push({ username: t.username, displayName: t.displayName });
			}
		}

		const winningIndex = Math.floor(Math.random() * ticketPool.length);
		const winningTicket = ticketPool[winningIndex];
		const prizeAmount = lottery.jackpotPool;

		// Award winner
		await EconomyService.addBalance(server, winningTicket.username, winningTicket.displayName, prizeAmount, true);

		// Record winner and reset for next round
		lottery.lastWinner = {
			username: winningTicket.username,
			displayName: winningTicket.displayName,
			amount: prizeAmount,
			wonAt: new Date(),
		};
		lottery.round += 1;
		lottery.jackpotPool = this.INITIAL_JACKPOT;
		lottery.tickets = [];
		await lottery.save();

		// Broadcast win message
		if (bot && bot.joined) {
			bot.chatQueue.send(
				`[Xổ Số 18:00] KẾT QUẢ QUAY THƯỞNG: Chúc mừng ${winningTicket.displayName} đã trúng Hũ Jackpot trị giá ${prizeAmount.toLocaleString("vi-VN")} xu!`,
				ChatPriority.HIGH
			);
		}

		return {
			drawn: true,
			winner: {
				username: winningTicket.username,
				displayName: winningTicket.displayName,
				amount: prizeAmount,
			},
			jackpotPool: prizeAmount,
			totalTickets,
		};
	}

	/**
	 * Start the cron/interval scheduler to check and draw every day at 18:00 (UTC+7)
	 */
	public static startScheduler(bot: Minecraft): void {
		this.stopScheduler();

		this.dailyDrawTimer = setInterval(async () => {
			if (!bot.joined || !bot.config?.connection?.host) return;

			const now = new Date();
			const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
			const hours = vnNow.getUTCHours();
			const minutes = vnNow.getUTCMinutes();
			const dateStr = vnNow.toISOString().slice(0, 10);

			// Check if exactly 18:00 and hasn't drawn today yet
			if (hours === 18 && minutes === 0 && this.lastDrawDateStr !== dateStr) {
				this.lastDrawDateStr = dateStr;
				await this.drawLottery(bot.config.connection.host, bot);
			}
		}, 30 * 1000); // Check every 30 seconds
	}

	public static stopScheduler(): void {
		if (this.dailyDrawTimer) {
			clearInterval(this.dailyDrawTimer);
			this.dailyDrawTimer = null;
		}
	}
}
