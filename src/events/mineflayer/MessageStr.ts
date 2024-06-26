import { Minecraft } from "../../structures";
import { Colors, APIEmbed } from "discord.js";
import { DisconnectType, Server, ServerIp } from "../../types";
import { goals } from "mineflayer-pathfinder";
import { MineflayerEvent } from "../../types";

export const data = {
	name: MineflayerEvent.MessageStr,
};

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

let messages: MessageList[] = [];
let countMsgs = 0;
let flagged = false;

export async function execute(main: Minecraft, serverMsg: string) {
	if (!serverMsg) return;

	login(main, serverMsg);

	if (serverMsg.endsWith("players sleeping")) return;

	livechat(main, serverMsg);
}

function livechat(main: Minecraft, serverMsg: string) {
	if (!serverMsg) return;

	const { username, message, rank } = parseUserMessage(serverMsg.trim());

	// color, escape discord format
	let msg = "";
	let msgType: MessageType;
	if (!username) {
		msg = escapeDiscordFormat(serverMsg);
		msgType = MessageType.Server;
		if (isWhisperMsg(serverMsg)) msgType = MessageType.Whisper;
		if (isAchievementMsg(serverMsg)) msgType = MessageType.Achievement;
		if (username === main.bot.username) msgType = MessageType.BotChat;
		if (serverMsg.endsWith("joined the game.") || serverMsg.endsWith("đã tham gia")
			|| serverMsg.startsWith("+ ")) msgType = MessageType.Join;
		if (serverMsg.endsWith("left the game.")
			|| serverMsg.startsWith("- ")) msgType = MessageType.Quit;
	} else {
		// livechat style
		let prefix = `**<${escapeDiscordFormat(username)}>**`;
		if (rank) prefix = `**<\`[${rank}]\` ${escapeDiscordFormat(username)}>**`;
		msg = `${prefix} ${escapeDiscordFormat(message)}`;
		msgType = MessageType.Chat;
		if (message.startsWith(">")) msgType = MessageType.HighlightChat;
	}

	messages.push({ type: msgType, msg, server: main.config.serverInfo.ip });

	// ratelimit
	const { rateLimitFlags } = main.config.livechat;
	if (rateLimitFlags.enabled) {
		countMsgs++;
		setTimeout(() => countMsgs--, rateLimitFlags.keepCountTime);
		if (countMsgs > rateLimitFlags.flaggedCount && !flagged) {
			setTimeout(() => flagged = false, rateLimitFlags.time);
			flagged = true;
		}
	}

	const generateEmbeds = () => {
		const embeds: APIEmbed[] = [];
		const tempMsgs = messages.filter(msgs => msgs.server === main.config.serverInfo.ip);
		for (let i = 0; i < tempMsgs.length; i++) {
			const prevMsg = tempMsgs[i - 1];
			const currentMsg = tempMsgs[i];
			if (!currentMsg.msg) continue;
			if (prevMsg && currentMsg
				// same type
				&& prevMsg.type === currentMsg.type
				// msg size < 4096
				&& embeds[embeds.length - 1].description.length < 4096) {
				embeds[embeds.length - 1]["description"] += currentMsg.msg + "\n";

				// 
				if (embeds[embeds.length - 1].description.split("\n").length <= 10)
					continue;
			}
			const embed: APIEmbed = {
				timestamp: new Date().toISOString(),
				description: currentMsg.msg + "\n",
				color: colors[currentMsg.type]
			};
			embeds.push(embed);
		}
		return embeds;
	};
	const embeds = generateEmbeds();
	if (flagged && embeds.length < rateLimitFlags.minimumEmbeds) return;

	main.channel.send({ embeds });
	messages = messages.filter(msgs => msgs.server !== main.config.serverInfo.ip);
}

function login(main: Minecraft, serverMsg: string) {
	const { authme } = main.config;
	if (serverMsg.includes("/l") || serverMsg.includes("/login"))
		main.bot.chat(`/login ${authme}`);

	if (serverMsg.includes("/reg"))
		main.bot.chat(`/reg ${authme} ${authme}`);

	if (serverMsg === main.bot.username + " joined the game." || serverMsg === main.bot.username + " đã vào trò chơi.") {
		main.currentServer = Server.Main;
	}

	if (serverMsg === "[+] " + main.bot.username) {
		main.currentServer = Server.Queue;
		setTimeout(() => {
			if (main.currentServer === Server.Queue) main.bot.quit();
		}, 5 * 60 * 1000);
	}

	if (serverMsg === " dùng lệnh/anarchyvn để vào server Anarchy.") {
		main.bot.chat("/anarchyvn");
	}

	// Anarchyvn
	if (serverMsg === " Đăng nhập thành công!") {
		main.bot.activateItem();
	}

	// 2a2b , MCVui
	if (serverMsg === "Bảo mật > Bạn đã đăng nhập thành công."
		|| serverMsg === "[*] Chào Mừng " + main.bot.username + " Đã Đến Máy Chủ MCVUI.NET") {
		setTimeout(() => {
			// console.log(main.bot.inventory)
			main.bot.setQuickBarSlot(4);
			main.bot.activateItem(); // middle hotbar
		}, 7 * 1000);
	}

	if (serverMsg === "[✔] Đăng nhập thành công!"
		|| serverMsg === "[✔] Bạn đã đăng kí thành công.") {
		main.currentServer = Server.Queue;
		main.bot.pathfinder.setGoal(new goals.GoalNear(3, 202, 25, 0));
		const click = () => {
			if (main.currentServer === Server.Main) return;
			main.bot.activateEntity(main.bot.nearestEntity());
			setTimeout(click, 10 * 1000);
		};
		click();
	}

	if (serverMsg === "(!) Đăng nhập thành công!") {
		main.currentServer = Server.Queue;
		const entityData = Object.values(main.bot.entities);
		const npc = entityData.find(e => e.metadata.find(v => extractAllText(JSON.parse(v?.toString() || "{}")).includes("2Y2C")));
		if (!npc) return main.bot.quit(DisconnectType.NPC);
		main.bot.pathfinder.setGoal(new goals.GoalNear(npc.position.x, npc.position.y, npc.position.z, 1));
		const click = () => {
			if (main.currentServer === Server.Main) return;
			main.bot.activateEntity(npc);
			setTimeout(click, 5 * 1000);
		};
		click();
	}
}

function extractAllText(formattedText: object) {
	const textValues = [];

	function extract(obj: { extra?: { text: string }[], text?: string }) {
		if (obj.text) {
			textValues.push(obj.text);
		}

		if (Array.isArray(obj.extra)) {
			obj.extra.forEach(extract);
		}
	}

	extract(formattedText);

	return textValues.join("");
}

function escapeDiscordFormat(text: string): string {
	// Các format cần thêm "\"
	const formats = ["*", "_", "~", "`", "-", "#"];

	// Sử dụng biểu thức chính quy để tìm và thay thế các format
	const regex = new RegExp(`(${formats.map(format => `\\${format}`).join("|")})`, "g");
	return text.replace(regex, "\\$1");
}

function parseUserMessage(input) {
	const regex = /^<(?:\[([^\]]+)\])?(\w+)>\s*(.*)$|^MEMBER\s+(\w+)\s+(?:➡|>>)\s+(.*)$|^(\w+)\s+>>\s+(.*)$/;
	const matches = input.match(regex);

	if (matches) {
		const [, rank, username, message1, message2, username3, message3] = matches;

		if (username) {
			return { rank: rank || null, username, message: message1 || message2 };
		} else if (username3) {
			return { rank: null, username: username3, message: message3 };
		}
	}
	return { rank: null, username: null, message: input };
}

// function parseUserMessage(input: string) {
// 	const regex = /^<(\w+)>\s+(.*)$|^MEMBER\s+(\w+)\s+➡\s+(.*)$|^MEMBER\s+\*(\w+)\s+➡\s+(.*)$|^(\w+)\s+>>\s+(.*)$|^\*(\w+)\s+>>\s+(.*)$|^<\[([^\]]+)\](\w+)>\s+(.*)$|^<\[([^\]]+)\](\w+)>\s+(.*)$/;
// 	const matches = input.match(regex);

// 	if (matches) {
// 		const [, username1, message1, username2, message2, username3, message3, username4, message4, username5, message5, rank1, username6, message6, rank2, username7, message7] = matches;

// 		if (username1) {
// 			return { rank: null, username: username1, message: message1 };
// 		} else if (username2) {
// 			return { username: username2, message: message2 };
// 		} else if (username3) {
// 			return { username: username3, message: message3 };
// 		} else if (username4) {
// 			return { rank: null, username: username4, message: message4 };
// 		} else if (username5) {
// 			return { rank: null, username: username5, message: message5 };
// 		} else if (rank1) {
// 			return { rank: rank1, username: username6, message: message6 };
// 		} else if (rank2) {
// 			return { rank: rank2, username: username7, message: message7 };
// 		}
// 	}
// 	return { rank: null, username: null, message: input };
// }

function isWhisperMsg(inputString: string) {
	const p = inputString.split(" ");
	if (p[1] === "nhắn:")
		return true;
	return false;
}

function isAchievementMsg(serverMsg: string) {
	if (serverMsg.includes("has made the advancement") || serverMsg.includes("has complete") || serverMsg.includes("has reached"))
		return true;
	return false;
}
