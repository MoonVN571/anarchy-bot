import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";
import { ChatParser, MessageType } from "../../utils/chatParser";
import { AuthHandler } from "../../utils/authHandler";
import { MessageModel } from "../../database/models/MessageModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { QuoteService } from "../../services/QuoteService";
import { MessageClassifierService } from "../../services/MessageClassifierService";

export default class MessageStrEvent extends MineflayerEvent {
	constructor() {
		super({
			name: "messagestr",
			once: false,
		});
	}

	async execute(
		bot: Minecraft,
		serverMsg: string,
		position?: string,
		jsonMsg?: any,
		sender?: string
	): Promise<void> {
		if (!serverMsg && !jsonMsg) return;

		const serverIp = bot.config.serverInfo.ip;

		// 1. Parse chat message first to resolve username and full message format
		const parsed = ChatParser.parse(bot, serverMsg, jsonMsg, sender);
		if (!parsed) return;

		const fullMsg = parsed.rawText;
		if (!fullMsg || fullMsg.endsWith("players sleeping")) return;

		// console.log(`[Minecraft Chat] ${fullMsg}`);

		// 2. AuthMe / PIN handling (Non-premium login)
		AuthHandler.handle(bot, serverMsg || fullMsg);

		// 3. Push to Discord livechat queue
		bot.liveChatManager.push(parsed);

		// 4. Process Database & Services Asynchronously
		this.processBackgroundServices(bot, serverIp, parsed, fullMsg);
	}

	private async processBackgroundServices(
		bot: Minecraft,
		serverIp: string,
		parsed: any,
		fullMsg: string
	): Promise<void> {
		const cleanText = parsed.rawText;

		// A. Handle Player Chat Messages
		if (parsed.username && parsed.message && parsed.type === MessageType.Chat) {
			const lowerUser = parsed.username.toLowerCase().trim();

			bot.client.logger.debug(
				"Chat",
				`[${serverIp}] <${parsed.username}>${parsed.rank ? ` [Rank: ${parsed.rank}]` : ""}: "${parsed.message}"`
			);

			// 1. Save chat log to MessageModel
			MessageModel.create({
				server: serverIp,
				username: lowerUser,
				displayName: parsed.username,
				rank: parsed.rank || null,
				message: parsed.message,
				type: parsed.type,
				timestamp: new Date(),
			}).catch(() => { });

			// 2. Increment message count in PlayerModel & Redis Leaderboard
			PlayerModel.updateOne(
				{ server: serverIp, username: lowerUser },
				{
					$setOnInsert: {
						server: serverIp,
						username: lowerUser,
						displayName: parsed.username,
						firstSeen: new Date(),
						playtime: 0,
						kills: 0,
						deaths: 0,
					},
					$set: { lastSeen: new Date(), isOnline: true },
					$inc: { messageCount: 1 },
				},
				{ upsert: true }
			).catch(() => { });

			RedisManager.incrementLeaderboard(serverIp, "messages", lowerUser, 1).catch(() => { });

			// 3. Save potential quotes
			QuoteService.recordPotentialQuote(
				serverIp,
				lowerUser,
				parsed.username,
				parsed.message
			).catch(() => { });
			return;
		}

		// B. Handle Non-Player Messages (Join/Leave, Death, System, or Unclassified Prompter)
		await MessageClassifierService.classifyAndProcess(bot, cleanText, fullMsg, parsed);
	}
}
