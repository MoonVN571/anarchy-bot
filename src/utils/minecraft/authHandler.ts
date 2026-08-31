import { Minecraft } from "../../structures";
import { Server } from "../../typings";

export class AuthHandler {
	/**
	 * Handles in-game authentication (AuthMe, PIN) and server redirection logic
	 */
	public static handle(main: Minecraft, rawMsg: string): void {
		const authme = main.config.auth.authmePassword;
		const botUsername = main.bot?.username;
		const lowerMsg = rawMsg.toLowerCase();

		// 1. Handle AuthMe / Password commands
		if (authme) {
			if (
				rawMsg.includes("/l ") ||
				rawMsg.includes("/login") ||
				lowerMsg.includes("vui lòng đăng nhập") ||
				lowerMsg.includes("please login") ||
				lowerMsg.includes("/login <password>")
			) {
				main.bot.chat(`/login ${authme}`);
			} else if (
				rawMsg.includes("/reg ") ||
				rawMsg.includes("/register") ||
				lowerMsg.includes("vui lòng đăng ký") ||
				lowerMsg.includes("please register") ||
				lowerMsg.includes("/register <password>")
			) {
				main.bot.chat(`/reg ${authme} ${authme}`);
			} else if (
				rawMsg.includes("Sử dụng: /dangnhap") ||
				rawMsg.includes("/dangnhap")
			) {
				main.bot.chat(`/dangnhap ${authme}`);
			} else if (
				rawMsg.includes("Sử dụng: /dangky") ||
				rawMsg.includes("/dangky")
			) {
				main.bot.chat(`/dangky ${authme} ${authme}`);
			}
		}

		// 2. Handle PIN authentication
		if (
			main.config.auth.pin &&
			main.config.auth.pin.length > 0 &&
			(rawMsg.includes("/pin") || lowerMsg.includes("mã pin") || lowerMsg.includes("nhập pin"))
		) {
			main.bot.chat(`/pin ${main.config.auth.pin.join("")}`);
		}

		// 3. Handle Server Join Detection
		if (
			botUsername &&
			(
				rawMsg.includes(`[+] ${botUsername}`) ||
				rawMsg.includes(`AnarchyVN >> ${botUsername} đã tham gia`) ||
				rawMsg.includes(`2Y2C >> [+] ${botUsername}`) ||
				rawMsg.includes(`${botUsername} đã tham gia`) ||
				rawMsg.includes(`${botUsername} joined the game`)
			)
		) {
			main.currentServer = Server.Main;
			main.clearQueueTimeout();
		}

		// 4. Handle Queue Timeout
		if (main.currentServer !== Server.Main) {
			main.startQueueTimeout();
		}

		// 5. Handle Server-specific navigation
		this.handleServerNavigation(main, lowerMsg);
	}

	private static handleServerNavigation(main: Minecraft, lowerMsg: string): void {
		if (main.config.auth.autoNavigateCommand) {
			main.bot.chat(main.config.auth.autoNavigateCommand);
			main.currentServer = Server.Queue;
			return;
		}

		if (lowerMsg.includes("/avn để vào server") || lowerMsg.includes("/avn de vao server")) {
			main.bot.chat("/avn");
			main.currentServer = Server.Queue;
		} else if (
			lowerMsg.includes("/2y2c để vào server") ||
			lowerMsg.includes("/2y2c de vao server") ||
			lowerMsg.includes("dùng lệnh/2y2c") ||
			lowerMsg.includes("dùng lệnh /2y2c")
		) {
			main.bot.chat("/2y2c");
			main.currentServer = Server.Queue;
		} else if (lowerMsg.includes("đăng nhập thành công")) {
			main.bot.activateItem();
		}
	}
}
