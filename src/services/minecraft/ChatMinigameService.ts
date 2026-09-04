import { Minecraft } from "../../structures";
import { EconomyService } from "./EconomyService";
import { ChatPriority } from "./ChatQueueService";

export interface IActiveMinigame {
	type: "math" | "scramble" | "typer";
	questionText: string;
	validAnswers: string[];
	displayAnswer: string;
	reward: number;
	startedAt: number;
	timeoutTimer: NodeJS.Timeout | null;
}

export class ChatMinigameService {
	private static activeGames: Map<string, IActiveMinigame> = new Map();

	private static readonly MINECRAFT_WORDS = [
		{ word: "kim cuong", aliases: ["kimcuong", "diamond"], display: "K-I-M-C-Ư-Ơ-N-G" },
		{ word: "netherite", aliases: ["netherite"], display: "N-E-T-H-E-R-I-T-E" },
		{ word: "ngoc ender", aliases: ["ngocender", "enderpearl", "ender pearl"], display: "N-G-Ọ-C-E-N-D-E-R" },
		{ word: "trung rong", aliases: ["trungrong", "dragon egg"], display: "T-R-Ứ-N-G-R-Ồ-N-G" },
		{ word: "tao vang", aliases: ["taovang", "golden apple", "gapple"], display: "T-Á-O-V-À-N-G" },
		{ word: "than da", aliases: ["thanda", "coal"], display: "T-H-A-N-Đ-Á" },
		{ word: "dan lang", aliases: ["danlang", "villager"], display: "D-Â-N-L-À-N-G" },
		{ word: "hop shulker", aliases: ["hopshulker", "shulker box", "shulker"], display: "H-Ộ-P-S-H-U-L-K-E-R" },
		{ word: "canh elytra", aliases: ["canhelytra", "elytra"], display: "C-Á-N-H-E-L-Y-T-R-A" },
		{ word: "dat set", aliases: ["datset", "clay"], display: "Đ-Ấ-T-S-É-T" },
	];

	private static readonly TYPER_CODES = [
		"anarchy-vietnam-2026",
		"mo0nbot",
		"minecraft",
		"survival",
		"hardcore",
		"2y2c-vietnam"
	];

	/**
	 * Check if there is an active minigame on server
	 */
	public static hasActiveMinigame(server: string): boolean {
		const s = server.toLowerCase().trim();
		return this.activeGames.has(s);
	}

	/**
	 * Start a random minigame on server
	 */
	public static startRandomMinigame(bot: Minecraft): void {
		if (!bot.joined || !bot.config?.connection?.host) return;
		const server = bot.config.connection.host.toLowerCase().trim();

		// Don't start another if one is already running
		if (this.activeGames.has(server)) return;

		const types: ("math" | "scramble" | "typer")[] = ["math", "scramble", "typer"];
		const chosenType = types[Math.floor(Math.random() * types.length)];

		let questionText = "";
		let validAnswers: string[] = [];
		let displayAnswer = "";
		let reward = 150;

		if (chosenType === "math") {
			const op = Math.random() > 0.4 ? "+" : Math.random() > 0.5 ? "-" : "*";
			let a = 0;
			let b = 0;
			let ans = 0;

			if (op === "+") {
				a = Math.floor(Math.random() * 80) + 15;
				b = Math.floor(Math.random() * 80) + 15;
				ans = a + b;
				reward = Math.floor(Math.random() * 51) + 100; // 100 - 150 xu
			} else if (op === "-") {
				a = Math.floor(Math.random() * 90) + 30;
				b = Math.floor(Math.random() * (a - 10)) + 5;
				ans = a - b;
				reward = Math.floor(Math.random() * 51) + 100;
			} else {
				a = Math.floor(Math.random() * 12) + 4;
				b = Math.floor(Math.random() * 12) + 4;
				ans = a * b;
				reward = Math.floor(Math.random() * 51) + 150; // 150 - 200 xu
			}

			questionText = `[Minigame] Ai tính nhanh nhất: ${a} ${op} ${b} = ? (Thưởng ${reward} xu)`;
			displayAnswer = String(ans);
			validAnswers = [String(ans)];
		} else if (chosenType === "scramble") {
			const item = this.MINECRAFT_WORDS[Math.floor(Math.random() * this.MINECRAFT_WORDS.length)];
			reward = Math.floor(Math.random() * 51) + 150; // 150 - 200 xu
			questionText = `[Minigame] Sắp xếp lại từ Minecraft sau: "${item.display}" (Thưởng ${reward} xu)`;
			displayAnswer = item.word;
			validAnswers = [item.word, ...item.aliases];
		} else {
			const code = this.TYPER_CODES[Math.floor(Math.random() * this.TYPER_CODES.length)];
			reward = Math.floor(Math.random() * 51) + 100; // 100 - 150 xu
			questionText = `[Minigame] Ai gõ nhanh nhất cụm từ: "${code}" (Thưởng ${reward} xu)`;
			displayAnswer = code;
			validAnswers = [code];
		}

		// Broadcast question
		bot.chatQueue.send(questionText, ChatPriority.NORMAL);

		// Setup timeout timer (45 seconds)
		const timeoutTimer = setTimeout(() => {
			this.onMinigameTimeout(bot, server);
		}, 45 * 1000);

		this.activeGames.set(server, {
			type: chosenType,
			questionText,
			validAnswers: validAnswers.map(a => a.toLowerCase().trim()),
			displayAnswer,
			reward,
			startedAt: Date.now(),
			timeoutTimer,
		});
	}

	/**
	 * Process incoming chat messages to check if it answers the active minigame
	 */
	public static async onChatMessage(
		bot: Minecraft,
		server: string,
		senderUsername: string,
		senderDisplayName: string,
		message: string
	): Promise<boolean> {
		const s = server.toLowerCase().trim();
		const game = this.activeGames.get(s);
		if (!game) return false;

		const cleanMsg = message.trim().toLowerCase();
		const isCorrect = game.validAnswers.some(ans => ans === cleanMsg);

		if (isCorrect) {
			// Clear timeout timer
			if (game.timeoutTimer) {
				clearTimeout(game.timeoutTimer);
			}
			this.activeGames.delete(s);

			// Award coins
			await EconomyService.addBalance(s, senderUsername, senderDisplayName, game.reward, true);

			// Announce winner
			bot.chatQueue.send(
				`[Minigame] Chúc mừng ${senderDisplayName} đã trả lời đúng nhanh nhất (Đáp án: ${game.displayAnswer}) và nhận được ${game.reward} xu!`,
				ChatPriority.HIGH
			);
			return true;
		}

		return false;
	}

	/**
	 * Handler when no one answered within 45 seconds
	 */
	private static onMinigameTimeout(bot: Minecraft, server: string): void {
		const game = this.activeGames.get(server);
		if (!game) return;

		this.activeGames.delete(server);

		if (bot.joined) {
			bot.chatQueue.send(
				`[Minigame] Đã hết thời gian! Đáp án chính xác là: "${game.displayAnswer}".`,
				ChatPriority.LOW
			);
		}
	}
}
