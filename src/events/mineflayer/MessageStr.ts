import { Minecraft } from "../../structures";
import { MineflayerEvent } from "../../typings/MineflayerEvent";
import { ChatParser } from "../../utils/chatParser";
import { AuthHandler } from "../../utils/authHandler";

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

		// 1. Parse chat message first to resolve username and full message format
		const parsed = ChatParser.parse(bot, serverMsg, jsonMsg, sender);
		if (!parsed) return;

		const fullMsg = parsed.rawText;
		if (!fullMsg || fullMsg.endsWith("players sleeping")) return;

		console.log(`[Minecraft Chat] ${fullMsg}`);

		// 2. Handle authentication & server navigation
		AuthHandler.handle(bot, serverMsg || fullMsg);

		// 3. Push to Discord livechat queue
		bot.liveChatManager.push(parsed);
	}
}

