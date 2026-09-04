import { StalkModel, IStalk } from "../../database/models/StalkModel";
import { Minecraft } from "../../structures";
import { ChatPriority } from "./ChatQueueService";

export class StalkService {
	public static readonly MAX_STALKS_PER_PLAYER = 10;

	/**
	 * Add a stalk target for a player
	 */
	public static async addStalk(
		server: string,
		watcher: string,
		watcherDisplayName: string,
		target: string,
		targetDisplayName: string
	): Promise<{ success: boolean; message: string }> {
		const s = server.toLowerCase().trim();
		const w = watcher.toLowerCase().trim();
		const t = target.toLowerCase().trim();

		if (w === t) {
			return { success: false, message: "Bạn không thể tự theo dõi chính mình!" };
		}

		const currentCount = await StalkModel.countDocuments({ server: s, watcher: w });
		if (currentCount >= this.MAX_STALKS_PER_PLAYER) {
			return {
				success: false,
				message: `Bạn chỉ có thể theo dõi tối đa ${this.MAX_STALKS_PER_PLAYER} người chơi cùng lúc!`,
			};
		}

		const existing = await StalkModel.findOne({ server: s, watcher: w, target: t });
		if (existing) {
			return {
				success: false,
				message: `Bạn đã và đang theo dõi người chơi ${targetDisplayName} rồi!`,
			};
		}

		await StalkModel.create({
			server: s,
			watcher: w,
			watcherDisplayName,
			target: t,
			targetDisplayName,
		});

		return {
			success: true,
			message: `Đã kích hoạt theo dõi người chơi "${targetDisplayName}". Bot sẽ whisper thông báo khi mục tiêu online/offline.`,
		};
	}

	/**
	 * Remove a stalk target
	 */
	public static async removeStalk(
		server: string,
		watcher: string,
		target: string
	): Promise<{ success: boolean; message: string }> {
		const s = server.toLowerCase().trim();
		const w = watcher.toLowerCase().trim();
		const t = target.toLowerCase().trim();

		const res = await StalkModel.findOneAndDelete({ server: s, watcher: w, target: t });
		if (!res) {
			return {
				success: false,
				message: `Bạn chưa từng đăng ký theo dõi người chơi "${target}".`,
			};
		}

		return {
			success: true,
			message: `Đã hủy theo dõi người chơi "${res.targetDisplayName || target}".`,
		};
	}

	/**
	 * Get list of targets watched by a player
	 */
	public static async getStalkList(server: string, watcher: string): Promise<IStalk[]> {
		const s = server.toLowerCase().trim();
		const w = watcher.toLowerCase().trim();
		return StalkModel.find({ server: s, watcher: w }).sort({ createdAt: -1 }).exec();
	}

	/**
	 * Triggered when a player joins the server
	 */
	public static async onPlayerJoin(
		server: string,
		targetUsername: string,
		targetDisplayName: string,
		bot: Minecraft
	): Promise<void> {
		if (!bot || !bot.joined) return;

		const s = server.toLowerCase().trim();
		const t = targetUsername.toLowerCase().trim();

		try {
			const stalkers = await StalkModel.find({ server: s, target: t });
			for (const stalker of stalkers) {
				// Whisper to watcher if watcher is online
				const isOnline = bot.bot?.players?.[stalker.watcher] !== undefined;
				if (isOnline) {
					bot.chatQueue.send(
						`/w ${stalker.watcher} [Stalk Alert] Mục tiêu "${targetDisplayName}" vừa đăng nhập vào server!`,
						ChatPriority.COMMAND
					);
				}
			}
		} catch (error) {
			bot.client.logger.error(`[StalkService] Error processing join for ${targetUsername}: ${error}`);
		}
	}

	/**
	 * Triggered when a player leaves the server
	 */
	public static async onPlayerLeave(
		server: string,
		targetUsername: string,
		targetDisplayName: string,
		bot: Minecraft
	): Promise<void> {
		if (!bot || !bot.joined) return;

		const s = server.toLowerCase().trim();
		const t = targetUsername.toLowerCase().trim();

		try {
			const stalkers = await StalkModel.find({ server: s, target: t });
			for (const stalker of stalkers) {
				const isOnline = bot.bot?.players?.[stalker.watcher] !== undefined;
				if (isOnline) {
					bot.chatQueue.send(
						`/w ${stalker.watcher} [Stalk Alert] Mục tiêu "${targetDisplayName}" vừa rời khỏi server.`,
						ChatPriority.COMMAND
					);
				}
			}
		} catch (error) {
			bot.client.logger.error(`[StalkService] Error processing leave for ${targetUsername}: ${error}`);
		}
	}
}
