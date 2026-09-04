import { inGameCommandManager } from "../../commands";
import { MessageModel } from "../../database/models/MessageModel";
import { PlayerModel } from "../../database/models/PlayerModel";
import { RedisManager } from "../../redis/RedisManager";
import { MailService, MessageClassifierService, QuoteService } from "../../services";
import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings";
import { AuthHandler, ChatParser, globalSpamDetector, MessageType } from "../../utils";

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

		const serverIp = bot.config.connection.host;

		// 1. AuthMe / PIN / Premium / Lobby navigation handling (process on ALL incoming raw messages)
		const rawCandidate = serverMsg || (typeof jsonMsg === "string" ? jsonMsg : jsonMsg?.text) || "";
		if (rawCandidate) {
			AuthHandler.handle(bot, rawCandidate);
		}

		// 2. Parse chat message to resolve username and formatted structure
		const parsed = ChatParser.parse(bot, serverMsg, jsonMsg, sender);
		if (!parsed) return;

		const fullMsg = parsed.rawText;
		if (!fullMsg || fullMsg.endsWith("players sleeping")) return;

		// If rawCandidate was empty, fallback handle parsed raw text
		if (!rawCandidate) {
			AuthHandler.handle(bot, fullMsg);
		}

		const botName = bot.bot?.username || bot.config.connection.username || "";
		const isBotTip = fullMsg.includes("[Bot Tip]") || fullMsg.startsWith("[BOT]") || fullMsg.startsWith("> [BOT]");
		const isSelfMessage =
			parsed.type === MessageType.BotChat ||
			isBotTip ||
			(botName && parsed.username && parsed.username.toLowerCase() === botName.toLowerCase());

		// Check spam / duplicate detection
		const { isSpam } = globalSpamDetector.checkDuplicate(parsed, serverIp);

		// Count valid incoming server messages/events for auto tip trigger (skip spam/duplicate messages)
		if (!isSpam && !isSelfMessage) {
			bot.autoMessageService.onServerMessage();
		}

		// 3. In-Game Minecraft Commands Handler (Prefix "!") - only process commands from other players
		if (!isSelfMessage) {
			const userMsg = (parsed.message || "").trim();
			if (parsed.username && userMsg.startsWith("!")) {
				await inGameCommandManager.handleInGameMessage(bot, parsed.username, userMsg);
			} else if (parsed.type === MessageType.Whisper || ChatParser.isWhisperMsg(fullMsg)) {
				// Extract whisper sender and message if sent as direct whisper to bot
				const whisperMatch = fullMsg.match(/^([a-zA-Z0-9_]{3,16})\s+(?:thì\s+thầm|whispers|tells\s+you|whispered\s+to\s+you|nhắn\s+cho\s+bạn):\s*(.*)$/i)
					|| fullMsg.match(/^\[([a-zA-Z0-9_]{3,16})\s*->\s*(?:me|tôi|bạn)\]\s*(.*)$/i);
				if (whisperMatch) {
					const wMsg = whisperMatch[2].trim();
					if (wMsg.startsWith("!")) {
						await inGameCommandManager.handleInGameMessage(bot, whisperMatch[1], wMsg);
					}
				}
			} else {
				// Fallback: Check if message contains an in-game command prefixed with "!" from any player
				const cmdMatch = fullMsg.match(/(?:^|[\s<\[\(])(?<user>[a-zA-Z0-9_]{3,16})[>\]\)]?\s*[:»> ]\s*(?<cmd>![a-zA-Z0-9_]+.*)$/);
				if (cmdMatch && cmdMatch.groups) {
					await inGameCommandManager.handleInGameMessage(bot, cmdMatch.groups.user, cmdMatch.groups.cmd.trim());
				}
			}
		}

		// 4. Filter out sensitive auth commands before pushing to Discord
		const isAuthCmd =
			fullMsg.startsWith("/login") ||
			fullMsg.startsWith("/reg") ||
			fullMsg.startsWith("/register") ||
			fullMsg.startsWith("/pin") ||
			fullMsg.startsWith("/dangnhap") ||
			fullMsg.startsWith("/dangky") ||
			(bot.config.auth.authmePassword && fullMsg.includes(bot.config.auth.authmePassword));

		// Push to Discord livechat queue
		if (!isAuthCmd) {
			bot.liveChatManager.push(parsed);
		}

		// 5. Process Database & Services Asynchronously
		this.processBackgroundServices(bot, serverIp, parsed, fullMsg);
	}

	private async processBackgroundServices(
		bot: Minecraft,
		serverIp: string,
		parsed: any,
		fullMsg: string
	): Promise<void> {
		const cleanText = parsed.rawText;

		// Skip background processing for bot messages and tips
		if (
			parsed.type === MessageType.BotChat ||
			cleanText.includes("[Bot Tip]") ||
			cleanText.startsWith("[BOT]") ||
			cleanText.startsWith("> [BOT]")
		) {
			return;
		}

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
						joinCount: 1,
						leaveCount: 0,
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

		// B. Handle Player Join / Leave Events
		if (parsed.type === MessageType.Join && parsed.username) {
			await bot.playtimeTracker?.handlePlayerJoin(parsed.username);
			MailService.deliverMailsToPlayer(bot, parsed.username).catch(() => { });
			MailService.checkDeliveryReceiptsForSender(bot, parsed.username).catch(() => { });
			return;
		}

		if (parsed.type === MessageType.Quit && parsed.username) {
			await bot.playtimeTracker?.handlePlayerLeave(parsed.username);
			return;
		}

		// C. Handle Non-Player Messages (Death, System, or Unclassified Messages)
		await MessageClassifierService.classifyAndProcess(bot, cleanText, fullMsg, parsed);
	}
}
