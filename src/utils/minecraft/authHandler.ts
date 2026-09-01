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
		const lobbyNpc = main.config.auth.lobbyNpc;

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
				if (lobbyNpc?.enabled) {
					setTimeout(() => {
						if (main.currentServer !== Server.Main) {
							main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
						}
					}, 1000);
				}
			} else if (
				rawMsg.includes("/reg ") ||
				rawMsg.includes("/register") ||
				lowerMsg.includes("vui lòng đăng ký") ||
				lowerMsg.includes("please register") ||
				lowerMsg.includes("/register <password>")
			) {
				main.bot.chat(`/reg ${authme} ${authme}`);
				if (lobbyNpc?.enabled) {
					setTimeout(() => {
						if (main.currentServer !== Server.Main) {
							main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
						}
					}, 1000);
				}
			} else if (
				rawMsg.includes("Sử dụng: /dangnhap") ||
				rawMsg.includes("/dangnhap")
			) {
				main.bot.chat(`/dangnhap ${authme}`);
				if (lobbyNpc?.enabled) {
					setTimeout(() => {
						if (main.currentServer !== Server.Main) {
							main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
						}
					}, 1000);
				}
			} else if (
				rawMsg.includes("Sử dụng: /dangky") ||
				rawMsg.includes("/dangky")
			) {
				main.bot.chat(`/dangky ${authme} ${authme}`);
				if (lobbyNpc?.enabled) {
					setTimeout(() => {
						if (main.currentServer !== Server.Main) {
							main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
						}
					}, 1000);
				}
			}
		}

		// 2. Handle PIN authentication
		if (
			main.config.auth.pin &&
			main.config.auth.pin.length > 0 &&
			(rawMsg.includes("/pin") || lowerMsg.includes("mã pin") || lowerMsg.includes("nhập pin"))
		) {
			main.bot.chat(`/pin ${main.config.auth.pin.join("")}`);
			if (lobbyNpc?.enabled) {
				setTimeout(() => {
					if (main.currentServer !== Server.Main) {
						main.smartPathfinderService?.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
					}
				}, 1000);
			}
		}

		// 3. Handle Server Join Detection
		const isMainServerJoin = botUsername && (
			rawMsg.includes(`AnarchyVN >> ${botUsername} đã tham gia`) ||
			rawMsg.includes(`2Y2C >> [+] ${botUsername}`) ||
			(!lobbyNpc?.enabled && (
				rawMsg.includes(`[+] ${botUsername}`) ||
				rawMsg.includes(`${botUsername} đã tham gia`) ||
				rawMsg.includes(`${botUsername} joined the game`)
			))
		);

		if (isMainServerJoin) {
			if (main.currentServer !== Server.Main) {
				main.client.logger.start(`[AuthHandler] Verified join to Main survival server!`);
				main.currentServer = Server.Main;
				main.clearQueueTimeout();
				main.smartPathfinderService?.clearLobbyNpcTimer();
				main.smartPathfinderService?.initMovements();
				main.antiAfkService?.start();
				main.autoEatService?.start();
			}
		}

		// 4. Handle Queue Timeout
		if (main.currentServer !== Server.Main) {
			main.startQueueTimeout();
		}

		// 5. Handle Server-specific navigation / Premium / Lobby
		this.handleServerNavigation(main, lowerMsg, rawMsg);
	}

	private static handleServerNavigation(main: Minecraft, lowerMsg: string, rawMsg: string): void {
		if (main.config.auth.autoNavigateCommand) {
			main.bot.chat(main.config.auth.autoNavigateCommand);
			main.currentServer = Server.Queue;
			return;
		}

		const lobbyNpc = main.config.auth.lobbyNpc;
		if (lobbyNpc?.enabled) {
			if (
				lowerMsg.includes("không cần đăng nhập") ||
				lowerMsg.includes("đã đăng nhập trước đó") ||
				lowerMsg.includes("bạn đã đăng nhập") ||
				lowerMsg.includes("đã đăng nhập rồi") ||
				lowerMsg.includes("already logged in") ||
				lowerMsg.includes("premium") ||
				lowerMsg.includes("đăng nhập thành công") ||
				lowerMsg.includes("logged in") ||
				lowerMsg.includes("nhập mã pin thành công") ||
				lowerMsg.includes("xác nhận thành công") ||
				lowerMsg.includes("tự động đăng nhập") ||
				lowerMsg.includes("bạn là premium") ||
				lowerMsg.includes("tài khoản chính chủ")
			) {
				main.client.logger.info(`[AuthHandler] Login/Premium detected ("${rawMsg.trim()}"), moving to lobby NPC at (${lobbyNpc.x}, ${lobbyNpc.y}, ${lobbyNpc.z})...`);
				main.smartPathfinderService.navigateToLobbyNpc(lobbyNpc.x, lobbyNpc.y, lobbyNpc.z);
				return;
			}
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
