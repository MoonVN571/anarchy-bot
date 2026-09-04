import { MailModel, IMail, PlayerModel } from "../../database/models";
import { Minecraft } from "../../structures";
import { formatRelativeTime } from "../../utils";
import { ChatPriority } from "./ChatQueueService";

export interface SendMailOptions {
	server: string;
	sender: string;
	senderPlatform: "discord" | "minecraft";
	senderId?: string;
	channelId?: string;
	receiver: string;
	message: string;
	bot?: Minecraft;
}

export interface SendMailResult {
	success: boolean;
	error?: "PLAYER_NOT_SEEN" | "SELF_SEND" | "TOO_LONG" | "EMPTY_MESSAGE" | "INTERNAL_ERROR";
	mail?: IMail;
	receiverDisplayName?: string;
	isDeliveredInstantly?: boolean;
}

export class MailService {
	/**
	 * Send an offline/online mailbox message
	 */
	public static async sendMail(options: SendMailOptions): Promise<SendMailResult> {
		const { server, sender, senderPlatform, senderId, channelId, receiver, message, bot } = options;

		const cleanMsg = (message || "").trim();
		if (!cleanMsg) {
			return { success: false, error: "EMPTY_MESSAGE" };
		}

		if (cleanMsg.length > 256) {
			return { success: false, error: "TOO_LONG" };
		}

		const cleanReceiver = receiver.toLowerCase().trim();
		const cleanSender = sender.toLowerCase().trim();

		if (cleanReceiver === cleanSender) {
			return { success: false, error: "SELF_SEND" };
		}

		// Seen Validation: Must have seen player on the server before
		const targetPlayer = await PlayerModel.findOne({
			server,
			username: cleanReceiver,
		});

		if (!targetPlayer) {
			return { success: false, error: "PLAYER_NOT_SEEN" };
		}

		const receiverDisplayName = targetPlayer.displayName || targetPlayer.username || receiver;

		try {
			// Check if receiver is currently online on the active bot instance
			const isCurrentlyOnline = bot?.bot?.players
				? Object.keys(bot.bot.players).some(p => p.toLowerCase() === cleanReceiver)
				: false;

			const mail = await MailModel.create({
				server,
				sender,
				senderPlatform,
				senderId: senderId || null,
				channelId: channelId || null,
				receiver: cleanReceiver,
				receiverDisplayName,
				message: cleanMsg,
				isDelivered: false,
				deliveredAt: null,
				deliveryNotified: false,
				createdAt: new Date(),
			});

			// If receiver is currently online, deliver immediately
			if (isCurrentlyOnline && bot) {
				this.deliverMailsToPlayer(bot, cleanReceiver).catch(err => {
					bot.client.logger.error(`[MailService] Error delivering instant mail to ${cleanReceiver}: ${err}`);
				});
				return {
					success: true,
					mail,
					receiverDisplayName,
					isDeliveredInstantly: true,
				};
			}

			return {
				success: true,
				mail,
				receiverDisplayName,
				isDeliveredInstantly: false,
			};
		} catch (error) {
			return { success: false, error: "INTERNAL_ERROR" };
		}
	}

	/**
	 * Get pending undelivered mails for a player
	 */
	public static async getPendingMails(server: string, receiver: string): Promise<IMail[]> {
		return MailModel.find({
			server,
			receiver: receiver.toLowerCase().trim(),
			isDelivered: false,
		}).sort({ createdAt: 1 });
	}

	/**
	 * Deliver all pending mails to a player in-game
	 */
	public static async deliverMailsToPlayer(bot: Minecraft, username: string): Promise<number> {
		if (!bot || !bot.bot) return 0;

		const cleanUser = username.toLowerCase().trim();
		const serverHost = bot.config.connection.host;

		const pendingMails = await this.getPendingMails(serverHost, cleanUser);
		if (!pendingMails || pendingMails.length === 0) return 0;

		// Safe delay (3.5s) to allow player to complete spawning/loading world
		await new Promise(r => setTimeout(r, 3500));

		// Check if player is still online
		if (!bot.bot?.players || !Object.keys(bot.bot.players).some(p => p.toLowerCase() === cleanUser)) {
			return 0;
		}

		// Find recipient player object to get best display name
		const recipientName = Object.values(bot.bot.players).find(p => p?.username?.toLowerCase() === cleanUser)?.username || username;

		const whisperLines: string[] = [
			`[Hộp thư] Bạn có ${pendingMails.length} tin nhắn offline chưa đọc:`,
			...pendingMails.map(m => {
				const timeAgo = formatRelativeTime(m.createdAt);
				return `[Thư từ ${m.sender} (${timeAgo})]: "${m.message}"`;
			}),
		];

		// Send whispers via centralized ChatQueueService
		bot.chatQueue.sendWhisper(recipientName, whisperLines, ChatPriority.COMMAND);

		// Mark mails as delivered
		const mailIds = pendingMails.map(m => m._id);
		const now = new Date();
		await MailModel.updateMany(
			{ _id: { $in: mailIds } },
			{ $set: { isDelivered: true, deliveredAt: now } }
		);

		bot.client.logger.info(
			`[MailService] [${serverHost}] Delivered ${pendingMails.length} offline mails to ${recipientName}`
		);

		// Notify senders about successful delivery
		for (const mail of pendingMails) {
			this.notifySenderOfDelivery(bot, mail, recipientName).catch(err => {
				bot.client.logger.error(`[MailService] Error notifying sender ${mail.sender}: ${err}`);
			});
		}

		return pendingMails.length;
	}

	/**
	 * Notify the sender that their mail was successfully received
	 */
	private static async notifySenderOfDelivery(
		bot: Minecraft,
		mail: IMail,
		receiverDisplayName: string
	): Promise<void> {
		const serverHost = bot.config.connection.host;

		if (mail.senderPlatform === "minecraft") {
			const cleanSender = mail.sender.toLowerCase().trim();
			const isSenderOnline = bot.bot?.players
				? Object.keys(bot.bot.players).some(p => p.toLowerCase() === cleanSender)
				: false;

			if (isSenderOnline) {
				const timeAgo = formatRelativeTime(mail.createdAt);
				bot.chatQueue.sendWhisper(
					mail.sender,
					`[Hộp thư] "${receiverDisplayName}" vừa vào server và đã nhận được thư bạn gửi lúc ${timeAgo}!`,
					ChatPriority.COMMAND
				);
				await MailModel.updateOne({ _id: mail._id }, { $set: { deliveryNotified: true } });
			}
		} else if (mail.senderPlatform === "discord") {
			if (mail.channelId) {
				try {
					const channel = bot.client.channels.cache.get(mail.channelId);
					if (channel && channel.isTextBased()) {
						const tag = mail.senderId ? `<@${mail.senderId}> ` : "";
						await (channel as any).send(
							`✅ [Hộp thư] ${tag}Người chơi **${receiverDisplayName}** vừa vào server \`${serverHost}\` và đã nhận được thư từ bạn!`
						);
						await MailModel.updateOne({ _id: mail._id }, { $set: { deliveryNotified: true } });
					}
				} catch (err) {
					bot.client.logger.debug("MailReceipt", `Could not send Discord receipt: ${err}`);
				}
			}
		}
	}

	/**
	 * Check and notify delivery receipts when a sender joins in-game
	 */
	public static async checkDeliveryReceiptsForSender(bot: Minecraft, senderUsername: string): Promise<void> {
		if (!bot || !bot.bot) return;

		const cleanSender = senderUsername.toLowerCase().trim();
		const serverHost = bot.config.connection.host;

		const unnotifiedMails = await MailModel.find({
			server: serverHost,
			sender: { $regex: new RegExp(`^${cleanSender}$`, "i") },
			senderPlatform: "minecraft",
			isDelivered: true,
			deliveryNotified: false,
		}).sort({ deliveredAt: 1 }).limit(5);

		if (!unnotifiedMails || unnotifiedMails.length === 0) return;

		// Wait 4s after join before sending receipts
		await new Promise(r => setTimeout(r, 4000));

		for (const mail of unnotifiedMails) {
			const timeSent = formatRelativeTime(mail.createdAt);
			const timeDelivered = mail.deliveredAt ? formatRelativeTime(mail.deliveredAt) : "vừa xong";

			bot.chatQueue.sendWhisper(
				senderUsername,
				`[Hộp thư] "${mail.receiverDisplayName}" đã nhận được thư bạn gửi lúc ${timeSent} (nhận lúc ${timeDelivered})!`,
				ChatPriority.COMMAND
			);

			await MailModel.updateOne({ _id: mail._id }, { $set: { deliveryNotified: true } });
		}
	}

	/**
	 * Get inbox history for a player (pending and recent delivered)
	 */
	public static async getInbox(
		server: string,
		username: string,
		limit: number = 5
	): Promise<{ pending: IMail[]; delivered: IMail[] }> {
		const cleanUser = username.toLowerCase().trim();

		const [pending, delivered] = await Promise.all([
			MailModel.find({
				server,
				receiver: cleanUser,
				isDelivered: false,
			}).sort({ createdAt: -1 }),
			MailModel.find({
				server,
				receiver: cleanUser,
				isDelivered: true,
			}).sort({ deliveredAt: -1 }).limit(limit),
		]);

		return { pending, delivered };
	}

	/**
	 * Clear all delivered read mails for a user
	 */
	public static async clearReadMails(server: string, username: string): Promise<number> {
		const cleanUser = username.toLowerCase().trim();
		const res = await MailModel.deleteMany({
			server,
			receiver: cleanUser,
			isDelivered: true,
		});
		return res.deletedCount || 0;
	}

	/**
	 * Get list of pending sent mails by a sender (for Discord >mail list)
	 */
	public static async getSentPendingMails(
		server: string,
		senderIdOrName: string
	): Promise<IMail[]> {
		return MailModel.find({
			server,
			$or: [{ senderId: senderIdOrName }, { sender: senderIdOrName }],
			isDelivered: false,
		}).sort({ createdAt: -1 });
	}

	/**
	 * Cancel a pending mail by ID
	 */
	public static async cancelMail(
		mailId: string,
		senderIdOrName: string
	): Promise<boolean> {
		const res = await MailModel.deleteOne({
			_id: mailId,
			$or: [{ senderId: senderIdOrName }, { sender: senderIdOrName }],
			isDelivered: false,
		});
		return (res.deletedCount || 0) > 0;
	}
}
