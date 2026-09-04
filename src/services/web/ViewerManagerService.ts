import express, { Application } from "express";
import http from "http";
import path from "path";
import EventEmitter from "events";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Minecraft } from "../../structures";
import { getBotStats, getSerializedInventory } from "./viewerSerializer";
import { renderViewerHubHtml, renderViewerPageHtml, HubServerCardInfo } from "./templates/viewerTemplates";

export interface BotViewerSession {
	botInstance: Minecraft;
	io: SocketIOServer;
	sockets: Socket[];
	cleanup: () => void;
}

interface ViewerEventEmitter extends EventEmitter {
	erase?: (id: string) => void;
}

interface BotWithViewerEmitter {
	viewer?: ViewerEventEmitter;
}

export class ViewerManagerService {
	private static instance: ViewerManagerService | null = null;

	private app: Application;
	private server: http.Server | null = null;
	private isRunning = false;
	private port: number;
	private sessions = new Map<string, BotViewerSession>();

	private constructor() {
		this.port = parseInt(process.env.VIEWER_PORT || "3007", 10);
		this.app = express();
		this.setupHubRoutes();
	}

	public static getInstance(): ViewerManagerService {
		if (!this.instance) {
			this.instance = new ViewerManagerService();
		}
		return this.instance;
	}

	/**
	 * Start the central HTTP server for all bot viewers on a single port
	 */
	public startServer(): void {
		if (this.isRunning || process.env.VIEWER_ENABLED === "false") return;

		this.server = http.createServer(this.app);
		this.server.listen(this.port, () => {
			console.log(`[ViewerManager] Central 3D World Viewer running on port ${this.port}`);
		});
		this.server.on("error", (err: Error & { code?: string }) => {
			if (err.code === "EADDRINUSE") {
				console.error(`[ViewerManager] Port ${this.port} is already in use. Viewer server could not start.`);
			} else {
				console.error(`[ViewerManager] Server error: ${err.message || err}`);
			}
		});

		this.isRunning = true;
	}

	/**
	 * Register and attach a Minecraft bot to the central viewer server
	 */
	public registerBot(botInstance: Minecraft): void {
		if (process.env.VIEWER_ENABLED === "false") return;

		const serverId = botInstance.config.id;
		const bot = botInstance.bot;
		if (!bot || !botInstance.joined) return;

		if (!this.isRunning) {
			this.startServer();
		}

		// Unregister previous session if any
		this.unregisterBot(serverId);

		const prefix = `/viewer/${serverId}`;
		const firstPerson = process.env.VIEWER_FIRST_PERSON === "true";
		const viewDistance = 6;

		// 1. Serve custom HTML page for /viewer/:serverId
		this.app.get(prefix, (_req, res) => {
			res.send(renderViewerPageHtml(botInstance));
		});

		// 2. Serve static web files for this server prefix (prismarine-viewer JS/textures)
		const publicPath = path.resolve(process.cwd(), "node_modules/prismarine-viewer/public");
		this.app.use(prefix, express.static(publicPath));

		// 3. Attach Socket.IO on this server's specific path
		if (!this.server) return;

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { WorldView } = require("prismarine-viewer/viewer");

		const io = new SocketIOServer(this.server, {
			path: `${prefix}/socket.io`,
			cors: { origin: "*" },
		});

		const sockets: Socket[] = [];
		const primitives: Record<string, unknown> = {};

		const botWithViewer = bot as unknown as BotWithViewerEmitter;
		const viewerEmitter: ViewerEventEmitter = new EventEmitter();
		viewerEmitter.erase = (id: string) => {
			delete primitives[id];
			for (const s of sockets) s.emit("primitive", { id });
		};
		botWithViewer.viewer = viewerEmitter;

		const broadcastStats = () => {
			const stats = getBotStats(botInstance);
			for (const s of sockets) {
				s.emit("stats_update", stats);
			}
		};

		const broadcastInventory = () => {
			const inv = getSerializedInventory(botInstance);
			for (const s of sockets) {
				s.emit("inventory_update", inv);
			}
		};

		const onMove = () => {
			const packet = { pos: bot.entity.position, yaw: bot.entity.yaw, addMesh: true, pitch: firstPerson ? bot.entity.pitch : undefined };
			for (const s of sockets) {
				s.emit("position", packet);
			}
			broadcastStats();
		};

		const onHealth = () => {
			broadcastStats();
		};

		const onInventoryChange = () => {
			broadcastInventory();
			broadcastStats();
		};

		io.on("connection", (socket: Socket) => {
			const displayVersion = bot.version === "1.21.11" ? "1.21.1" : bot.version;
			socket.emit("version", displayVersion);
			sockets.push(socket);

			const pos = bot.entity?.position || { x: 0, y: 0, z: 0 };
			const worldView = new WorldView(bot.world, viewDistance, pos, socket);
			worldView.init(pos);

			// Initial state packets
			socket.emit("stats_update", getBotStats(botInstance));
			socket.emit("inventory_update", getSerializedInventory(botInstance));

			// Prismarine Viewer native click event
			worldView.on("blockClicked", (block: { x: number; y: number; z: number } | null, face: number, button: number) => {
				botWithViewer.viewer?.emit("blockClicked", block, face, button);
				if (block && (button === 0 || button === 1)) {
					// Left click -> Click-to-Move
					const targetPos = face === 1 ? { x: block.x, y: block.y + 1, z: block.z } : block;
					botInstance.smartPathfinderService?.moveTo(targetPos.x, targetPos.y, targetPos.z);
				}
			});

			// Custom Web UI command listeners
			socket.on("click_to_move", (data: { x: number; y?: number; z: number }) => {
				if (data && typeof data.x === "number" && typeof data.z === "number") {
					botInstance.smartPathfinderService?.moveTo(data.x, data.y, data.z);
				}
			});

			socket.on("emergency_stop", () => {
				botInstance.smartPathfinderService?.stop();
				botInstance.highwayNavigationService?.stop();
				socket.emit("action_feedback", { type: "stop", message: "Đã dừng khẩn cấp toàn bộ di chuyển!" });
			});

			socket.on("toggle_anti_afk", () => {
				const current = botInstance.antiAfkService?.isEnabled;
				botInstance.antiAfkService?.setEnabled(!current);
				broadcastStats();
			});

			socket.on("trigger_eat", async () => {
				const res = await botInstance.autoEatService?.checkAndEat(true);
				socket.emit("action_feedback", {
					type: "eat",
					message: res ? "Đang tiến hành ăn thức ăn..." : "Không tìm thấy thức ăn phù hợp!",
				});
			});

			socket.on("trigger_totem", async () => {
				const res = await botInstance.autoEatService?.checkAndEquipTotem();
				socket.emit("action_feedback", {
					type: "totem",
					message: res ? "Đã trang bị Totem vào tay phụ!" : "Không có Totem trong kho đồ!",
				});
			});

			for (const id in primitives) {
				socket.emit("primitive", primitives[id]);
			}

			bot.on("move", onMove);
			bot.on("health", onHealth);
			bot.inventory.on("updateSlot", onInventoryChange);
			worldView.listenToBot(bot);

			socket.on("disconnect", () => {
				worldView.removeListenersFromBot(bot);
				const idx = sockets.indexOf(socket);
				if (idx !== -1) sockets.splice(idx, 1);
				if (sockets.length === 0) {
					bot.removeListener("move", onMove);
					bot.removeListener("health", onHealth);
					bot.inventory.removeListener("updateSlot", onInventoryChange);
				}
			});
		});

		const cleanup = () => {
			bot.removeListener("move", onMove);
			bot.removeListener("health", onHealth);
			bot.inventory.removeListener("updateSlot", onInventoryChange);
			for (const s of sockets) s.disconnect();
			io.close();
		};

		this.sessions.set(serverId, {
			botInstance,
			io,
			sockets,
			cleanup,
		});

		botInstance.client.logger.info(
			`[ViewerManager] Registered 3D Viewer for ${botInstance.config.name} at ${this.getViewerUrl(serverId)}`
		);
	}

	/**
	 * Unregister a bot session
	 */
	public unregisterBot(serverId: string): void {
		const session = this.sessions.get(serverId);
		if (session) {
			session.cleanup();
			this.sessions.delete(serverId);
		}
	}

	/**
	 * Broadcast 3D path line to viewer clients
	 */
	public broadcastPathUpdate(serverId: string, points: { x: number; y: number; z: number }[]): void {
		const session = this.sessions.get(serverId);
		if (!session) return;

		for (const socket of session.sockets) {
			socket.emit("path_update", { points });
		}
	}

	/**
	 * Get the public Web Viewer URL for a given server ID
	 */
	public getViewerUrl(serverId: string): string {
		const baseUrl = process.env.VIEWER_PUBLIC_URL || `http://localhost:${this.port}`;
		const cleanBase = baseUrl.replace(/\/+$/, "");
		return `${cleanBase}/viewer/${serverId}`;
	}

	/**
	 * Setup HTML Hub at /viewer
	 */
	private setupHubRoutes(): void {
		this.app.get("/viewer", (_req, res) => {
			const serverCards: HubServerCardInfo[] = Array.from(this.sessions.values()).map((s) => {
				const bot = s.botInstance;
				return {
					id: bot.config.id,
					name: bot.config.name || bot.config.id,
					host: bot.config.connection.host,
					botUsername: bot.bot?.username || "mo0nbot",
					viewerUrl: this.getViewerUrl(bot.config.id),
				};
			});

			res.send(renderViewerHubHtml(serverCards));
		});
	}
}

export const viewerManager = ViewerManagerService.getInstance();
