import { Minecraft } from "../../structures";
import { Colors, APIEmbed } from "discord.js";
import { DisconnectType, Server, ServerIp } from "../../typings/types";
import { goals } from "mineflayer-pathfinder";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

// Color constants for different message types
const colors = {
	chat: 0x979797,
	highlightChat: 0x2EA711,
	server: 0xb60000,
	whisper: 0xFD00FF,
	queue: 0xFFC214,
	dead: 0xDB2D2D,
	achievement: 0x7DF9FF,
	botChat: 0x4983e7,
	join: Colors.Green,
	quit: Colors.Red,
};

enum MessageType {
	Chat = "chat",
	BotChat = "botChat",
	HighlightChat = "highlightChat",
	Whisper = "whisper",
	Server = "server",
	Queue = "queue",
	Dead = "dead",
	Achievement = "achievement",
	Join = "join",
	Quit = "quit",
}

interface MessageList {
	msg: string;
	type: MessageType;
	server: ServerIp;
}

interface ParsedMessage {
	rank: string | null;
	username: string | null;
	message: string;
}

export default class MessageStrEvent extends MineflayerEvent {
	// Message queue and rate limiting state
	private messages: MessageList[] = [];
	private rateLimited = false;
	private messageWindow: number[] = []; // Timestamps of recent messages
	private burstCounter = 0; // Count of messages in burst interval

	constructor() {
		super({
			name: 'messagestr',
			once: false,
		});
	}

	async execute(bot: Minecraft, serverMsg: string): Promise<void> {
		if (!serverMsg || serverMsg.endsWith("players sleeping")) return;

		this.handleLogin(bot, serverMsg);
		this.processLiveChat(bot, serverMsg);
	}

	private processLiveChat(main: Minecraft, serverMsg: string): void {
		if (!serverMsg) return;

		const { username, message, rank } = this.parseUserMessage(serverMsg.trim());
		const messageInfo = this.formatMessage(main, serverMsg, username, message, rank);

		if (!messageInfo) return;

		this.messages.push({
			type: messageInfo.type,
			msg: messageInfo.formattedMsg,
			server: main.config.serverInfo.ip
		});

		this.handleRateLimit(main);
		this.sendMessagesToChannel(main);
	}

	private formatMessage(main: Minecraft, serverMsg: string, username: string | null, message: string, rank: string | null): { type: MessageType, formattedMsg: string } | null {
		let msgType = MessageType.Server;
		let formattedMsg = "";

		if (!username) {
			formattedMsg = this.escapeDiscordFormat(serverMsg);

			// Determine server message type
			if (this.isWhisperMsg(serverMsg)) msgType = MessageType.Whisper;
			else if (this.isAchievementMsg(serverMsg)) msgType = MessageType.Achievement;
			else if (username === main.bot.username) msgType = MessageType.BotChat;
			else if (serverMsg.endsWith("joined the game.") ||
                serverMsg.endsWith("đã tham gia") ||
                serverMsg.startsWith("+ ")) msgType = MessageType.Join;
			else if (serverMsg.endsWith("left the game.") ||
                serverMsg.startsWith("- ")) msgType = MessageType.Quit;
		} else {
			// Format player chat messages
			let prefix = `**<${this.escapeDiscordFormat(username)}>**`;
			if (rank) prefix = `**<\`[${rank}]\` ${this.escapeDiscordFormat(username)}>**`;

			formattedMsg = `${prefix} ${this.escapeDiscordFormat(message)}`;
			msgType = message.startsWith(">") ? MessageType.HighlightChat : MessageType.Chat;
		}

		return { type: msgType, formattedMsg };
	}

	private handleRateLimit(main: Minecraft): void {
		const { rateLimitFlags } = main.config.livechat;

		if (!rateLimitFlags.enabled) return;

		const now = Date.now();
        
		// Track message in sliding window
		this.messageWindow.push(now);
        
		// Remove messages outside the window
		this.messageWindow = this.messageWindow.filter(
			timestamp => now - timestamp < rateLimitFlags.windowSize
		);
        
		// Increment burst counter and schedule its decrement
		this.burstCounter++;
		setTimeout(() => this.burstCounter--, rateLimitFlags.burstInterval);
        
		// Check if rate limit conditions are met
		const windowExceeded = this.messageWindow.length > rateLimitFlags.messageThreshold;
		const burstExceeded = this.burstCounter > rateLimitFlags.burstThreshold;
        
		if ((windowExceeded || burstExceeded) && !this.rateLimited) {
			this.rateLimited = true;
            
			// Set a timeout to clear the rate limit
			setTimeout(() => {
				this.rateLimited = false;
                
				// If we have messages queued up, send them after the rate limit ends
				if (this.messages.some(msg => msg.server === main.config.serverInfo.ip)) 
					this.sendMessagesToChannel(main);
                
			}, rateLimitFlags.time);
            
			main.client.logger.warn(`Rate limit triggered for ${main.config.serverInfo.ip}, rate limiting for ${rateLimitFlags.time}ms`);
			// main.channel.send({
			//     embeds: [{
			//         color: colors.server,
			//         description: "⚠️ Rate limit triggered. Some messages will be delayed.",
			//         timestamp: new Date().toISOString()
			//     }]
			// }).catch(console.error);
		}
	}

	private sendMessagesToChannel(main: Minecraft): void {
		const embeds = this.generateEmbeds(main);
		const { rateLimitFlags } = main.config.livechat;

		// Skip sending if rate limited and not enough embeds
		if (this.rateLimited && embeds.length < rateLimitFlags.minimumEmbeds) return;

		if (embeds.length > 0) {
			main.channel.send({ embeds }).catch((err) => main.client.logger.error(`Error sending livechat message: ${err}`));
			this.messages = this.messages.filter(msgs => msgs.server !== main.config.serverInfo.ip);
		}
	}

	private generateEmbeds(main: Minecraft): APIEmbed[] {
		const embeds: APIEmbed[] = [];
		const serverMessages = this.messages.filter(msgs => msgs.server === main.config.serverInfo.ip);

		for (let i = 0; i < serverMessages.length; i++) {
			const prevMsg = serverMessages[i - 1];
			const currentMsg = serverMessages[i];

			if (!currentMsg.msg) continue;

			// Append to previous embed if possible
			if (prevMsg &&
                prevMsg.type === currentMsg.type &&
                embeds.length > 0 &&
                embeds[embeds.length - 1].description && embeds[embeds.length - 1].description!.length < 4096) {

				embeds[embeds.length - 1].description = (embeds[embeds.length - 1].description || "") + currentMsg.msg + "\n";

				// Continue if we haven't hit the line limit
				if (embeds.length > 0 && 
                    embeds[embeds.length - 1].description &&
                    embeds[embeds.length - 1].description!.split("\n").length <= 10) 
					continue;
                
			}

			// Create new embed
			const embed: APIEmbed = {
				timestamp: new Date().toISOString(),
				description: currentMsg.msg + "\n",
				color: colors[currentMsg.type]
			};

			embeds.push(embed);
		}

		return embeds;
	}

	private handleLogin(main: Minecraft, serverMsg: string): void {
		const { authme } = main.config;
		const botUsername = main.bot.username;

		// Handle authentication
		if (serverMsg.includes("/l") || serverMsg.includes("/login")) 
			main.bot.chat(`/login ${authme}`);
		else if (serverMsg.includes("/reg")) 
			main.bot.chat(`/reg ${authme} ${authme}`);
        

		// Handle server join detection
		if (serverMsg === `${botUsername} joined the game.` || serverMsg === `${botUsername} đã vào trò chơi.`) 
			main.currentServer = Server.Main;
		else if (serverMsg === "[+] " + botUsername) {
			main.currentServer = Server.Queue;
			setTimeout(() => {
				if (main.currentServer === Server.Queue) main.bot.quit();
			}, 5 * 60 * 1000);
		}

		// Server-specific login handlers
		this.handleServerSpecificLogin(main, serverMsg);
	}

	private handleServerSpecificLogin(main: Minecraft, serverMsg: string): void {
		// AnarchyVN specific
		if (serverMsg === " Dùng lệnh /avn để vào server.") 
			main.bot.chat("/avn");
		else if (serverMsg === " Đăng nhập thành công!") 
			main.bot.activateItem();
        

		// 2a2b, MCVui specific
		if (serverMsg === "Bảo mật > Bạn đã đăng nhập thành công." ||
            serverMsg === "[*] Chào Mừng " + main.bot.username + " Đã Đến Máy Chủ MCVUI.NET") {
			setTimeout(() => {
				main.bot.setQuickBarSlot(4);
				main.bot.activateItem(); // middle hotbar
			}, 7 * 1000);
		}

		// Queue handlers
		this.handleQueueLogin(main, serverMsg);
	}

	private handleQueueLogin(main: Minecraft, serverMsg: string): void {
		if (serverMsg === "[✔] Đăng nhập thành công!" ||
            serverMsg === "[✔] Bạn đã đăng kí thành công.") {
			main.currentServer = Server.Queue;
			main.bot.pathfinder.setGoal(new goals.GoalNear(3, 202, 25, 0));

			const clickNearestEntity = () => {
				if (main.currentServer === Server.Main) return;
				const entity = main.bot.nearestEntity();
				if (entity) main.bot.activateEntity(entity);
				setTimeout(clickNearestEntity, 10 * 1000);
			};

			clickNearestEntity();
		} else if (serverMsg === "(!) Đăng nhập thành công!") {
			main.currentServer = Server.Queue;
			const entityData = Object.values(main.bot.entities);
			const npc = entityData.find(e =>
				e.metadata.find(v => this.extractAllText(JSON.parse(v?.toString() || "{}")).includes("2Y2C"))
			);

			if (!npc) return main.bot.quit(DisconnectType.NPC);

			main.bot.pathfinder.setGoal(new goals.GoalNear(npc.position.x, npc.position.y, npc.position.z, 1));

			const clickNPC = () => {
				if (main.currentServer === Server.Main) return;
				main.bot.activateEntity(npc);
				setTimeout(clickNPC, 5 * 1000);
			};

			clickNPC();
		}
	}

	private extractAllText(formattedText: object): string {
		const textValues: string[] = [];

		function extract(obj: { extra?: { text: string }[], text?: string }) {
			if (obj.text) 
				textValues.push(obj.text);
            

			if (Array.isArray(obj.extra)) 
				obj.extra.forEach(extract);
            
		}

		extract(formattedText);
		return textValues.join("");
	}

	private escapeDiscordFormat(text: string): string {
		const formats = ["*", "_", "~", "`", "-", "#"];
		const regex = new RegExp(`(${formats.map(format => `\\${format}`).join("|")})`, "g");
		return text.replace(regex, "\\$1");
	}

	private parseUserMessage(input: string): ParsedMessage {
		const regex = /^<(?:\[([^\]]+)\])?(\w+)>\s*(.*)$|^MEMBER\s+(\w+)\s+(?:➡|>>)\s+(.*)$|^(\w+)\s+>>\s+(.*)$/;
		const matches = input.match(regex);

		if (matches) {
			const [, rank, username1, message1, username2, message2, username3, message3] = matches;

			if (username1) 
				return { rank: rank || null, username: username1, message: message1 };
			else if (username2) 
				return { rank: null, username: username2, message: message2 };
			else if (username3) 
				return { rank: null, username: username3, message: message3 };
            
		}

		return { rank: null, username: null, message: input };
	}

	private isWhisperMsg(inputString: string): boolean {
		const parts = inputString.split(" ");
		return parts[1] === "nhắn:";
	}

	private isAchievementMsg(serverMsg: string): boolean {
		return serverMsg.includes("has made the advancement") ||
            serverMsg.includes("has complete") ||
            serverMsg.includes("has reached");
	}
}
