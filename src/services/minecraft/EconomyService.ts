import { EconomyModel, IEconomy } from "../../database/models/EconomyModel";

export class EconomyService {
	public static readonly INITIAL_STARTER_COINS = 500;
	public static readonly WORK_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

	private static readonly WORK_MESSAGES = [
		"Bạn đi đào than thuê và nhận được",
		"Bạn đi câu cá tại bờ sông spawn và bán được",
		"Bạn loot được một rương đồ bỏ hoang và tìm thấy",
		"Bạn đi chặt gỗ thuê cho dân làng và kiếm được",
		"Bạn đánh bại một con Zombie nhặt được",
		"Bạn bán bánh mì tại chợ đen và thu về",
		"Bạn đi thu hoạch lúa mì thuê và nhận được",
		"Bạn chế tạo thuyền bán cho lữ khách và kiếm được",
		"Bạn tìm thấy mỏ đồng cũ và bán quặng được",
		"Bạn tham gia xây cầu đường qua đầm lầy và được trả",
	];

	/**
	 * Get or create economy account. Auto-grants 500 initial starter coins for first-timers.
	 */
	public static async getAccount(
		server: string,
		username: string,
		displayName?: string
	): Promise<{ account: IEconomy; isNewUser: boolean }> {
		const uname = username.toLowerCase().trim();
		const s = server.toLowerCase().trim();
		const dName = displayName || username;

		let account = await EconomyModel.findOne({ server: s, username: uname });
		let isNewUser = false;

		if (!account) {
			isNewUser = true;
			account = await EconomyModel.create({
				server: s,
				username: uname,
				displayName: dName,
				balance: this.INITIAL_STARTER_COINS,
				claimedStarter: true,
				workCount: 0,
				totalWon: 0,
				totalLost: 0,
			});
		} else if (displayName && account.displayName !== displayName) {
			account.displayName = displayName;
			await account.save();
		}

		return { account, isNewUser };
	}

	/**
	 * Add balance to player
	 */
	public static async addBalance(
		server: string,
		username: string,
		displayName: string,
		amount: number,
		isWin = false
	): Promise<IEconomy> {
		const { account } = await this.getAccount(server, username, displayName);
		account.balance += amount;
		if (isWin) {
			account.totalWon += amount;
		}
		await account.save();
		return account;
	}

	/**
	 * Deduct balance from player. Returns false if insufficient funds.
	 */
	public static async deductBalance(
		server: string,
		username: string,
		displayName: string,
		amount: number,
		isLoss = false
	): Promise<{ success: boolean; account: IEconomy; remaining: number }> {
		const { account } = await this.getAccount(server, username, displayName);
		if (account.balance < amount) {
			return { success: false, account, remaining: account.balance };
		}

		account.balance -= amount;
		if (isLoss) {
			account.totalLost += amount;
		}
		await account.save();
		return { success: true, account, remaining: account.balance };
	}

	/**
	 * Set balance for a player directly (Admin / Dev)
	 */
	public static async setBalance(
		server: string,
		username: string,
		displayName: string,
		amount: number
	): Promise<IEconomy> {
		const { account } = await this.getAccount(server, username, displayName);
		account.balance = Math.max(0, Math.floor(amount));
		await account.save();
		return account;
	}

	/**
	 * Deduct balance directly (Admin / Dev subcoin, clamps to 0)
	 */
	public static async deductBalanceDirect(
		server: string,
		username: string,
		displayName: string,
		amount: number
	): Promise<{ account: IEconomy; deducted: number }> {
		const { account } = await this.getAccount(server, username, displayName);
		const targetAmount = Math.max(0, Math.floor(amount));
		const actualDeduct = Math.min(account.balance, targetAmount);
		account.balance = Math.max(0, account.balance - actualDeduct);
		await account.save();
		return { account, deducted: actualDeduct };
	}

	/**
	 * Transfer balance between two players
	 */
	public static async transfer(
		server: string,
		fromUsername: string,
		fromDisplayName: string,
		toUsername: string,
		toDisplayName: string,
		amount: number
	): Promise<{ success: boolean; message: string; senderBalance?: number }> {
		if (amount <= 0 || !Number.isInteger(amount)) {
			return { success: false, message: "Số xu chuyển phải là số nguyên dương!" };
		}

		if (fromUsername.toLowerCase() === toUsername.toLowerCase()) {
			return { success: false, message: "Bạn không thể tự chuyển xu cho chính mình!" };
		}

		const senderRes = await this.deductBalance(server, fromUsername, fromDisplayName, amount, false);
		if (!senderRes.success) {
			return {
				success: false,
				message: `Số dư không đủ! Bạn chỉ có ${senderRes.remaining.toLocaleString("vi-VN")} xu.`,
			};
		}

		await this.addBalance(server, toUsername, toDisplayName, amount, false);

		return {
			success: true,
			message: `Đã chuyển thành công ${amount.toLocaleString("vi-VN")} xu cho ${toDisplayName}.`,
			senderBalance: senderRes.account.balance,
		};
	}

	/**
	 * Perform virtual work to earn coins
	 */
	public static async work(
		server: string,
		username: string,
		displayName: string
	): Promise<{
		success: boolean;
		earned?: number;
		newBalance?: number;
		flavorText?: string;
		cooldownSeconds?: number;
		isNewUser?: boolean;
	}> {
		const { account, isNewUser } = await this.getAccount(server, username, displayName);
		const now = Date.now();

		if (account.lastWorkedAt) {
			const elapsed = now - new Date(account.lastWorkedAt).getTime();
			if (elapsed < this.WORK_COOLDOWN_MS) {
				const remainingSec = Math.ceil((this.WORK_COOLDOWN_MS - elapsed) / 1000);
				return { success: false, cooldownSeconds: remainingSec, isNewUser };
			}
		}

		const earned = Math.floor(Math.random() * 201) + 50; // 50 - 250 xu
		const flavor = this.WORK_MESSAGES[Math.floor(Math.random() * this.WORK_MESSAGES.length)];

		account.balance += earned;
		account.workCount = (account.workCount || 0) + 1;
		account.lastWorkedAt = new Date(now);
		await account.save();

		return {
			success: true,
			earned,
			newBalance: account.balance,
			flavorText: flavor,
			isNewUser,
		};
	}

	/**
	 * Query Top Leaderboard for economy
	 */
	public static async getLeaderboard(
		server: string,
		category: "balance" | "won" | "lost" | "work",
		limit = 5
	): Promise<IEconomy[]> {
		const s = server.toLowerCase().trim();
		const sortField =
			category === "won"
				? { totalWon: -1 }
				: category === "lost"
				? { totalLost: -1 }
				: category === "work"
				? { workCount: -1 }
				: { balance: -1 };

		return EconomyModel.find({ server: s }).sort(sortField as any).limit(limit).exec();
	}
}
