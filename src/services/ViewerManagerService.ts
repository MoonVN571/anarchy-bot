import express, { Application } from "express";
import http from "http";
import path from "path";
import EventEmitter from "events";
import { Server as SocketIOServer, Socket } from "socket.io";
import { Minecraft } from "../structures";

export interface BotViewerSession {
	botInstance: Minecraft;
	io: SocketIOServer;
	sockets: Socket[];
	cleanup: () => void;
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
		if (this.isRunning || process.env.VIEWER_ENABLED !== "true") return;

		this.server = http.createServer(this.app);
		this.server.listen(this.port, () => {
			console.log(`[ViewerManager] Central 3D World Viewer running on port ${this.port}`);
		});
		this.server.on("error", (err: any) => {
			if (err.code === "EADDRINUSE") {
				console.error(`[ViewerManager] Port ${this.port} is already in use. Viewer server could not start.`);
			} else {
				console.error(`[ViewerManager] Server error: ${err}`);
			}
		});

		this.isRunning = true;
	}

	/**
	 * Register and attach a Minecraft bot to the central viewer server
	 */
	public registerBot(botInstance: Minecraft): void {
		if (process.env.VIEWER_ENABLED !== "true") return;

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

		// 1. Serve static web files for this server prefix
		const publicPath = path.resolve(process.cwd(), "node_modules/prismarine-viewer/public");
		this.app.use(prefix, express.static(publicPath));

		// 2. Attach Socket.IO on this server's specific path
		if (!this.server) return;

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { WorldView } = require("prismarine-viewer/viewer");

		const io = new SocketIOServer(this.server, {
			path: `${prefix}/socket.io`,
			cors: { origin: "*" },
		});

		const sockets: Socket[] = [];
		const primitives: Record<string, any> = {};

		(bot as any).viewer = new EventEmitter();
		(bot as any).viewer.erase = (id: string) => {
			delete primitives[id];
			for (const s of sockets) s.emit("primitive", { id });
		};

		const onMove = () => {
			const packet = { pos: bot.entity.position, yaw: bot.entity.yaw, addMesh: true, pitch: firstPerson ? bot.entity.pitch : undefined };
			for (const s of sockets) {
				s.emit("position", packet);
			}
		};

		io.on("connection", (socket: Socket) => {
			socket.emit("version", bot.version);
			sockets.push(socket);

			const worldView = new WorldView(bot.world, viewDistance, bot.entity.position, socket);
			worldView.init(bot.entity.position);

			worldView.on("blockClicked", (block: any, face: any, button: any) => {
				(bot as any).viewer?.emit("blockClicked", block, face, button);
			});

			for (const id in primitives) {
				socket.emit("primitive", primitives[id]);
			}

			bot.on("move", onMove);
			worldView.listenToBot(bot);

			socket.on("disconnect", () => {
				worldView.removeListenersFromBot(bot);
				const idx = sockets.indexOf(socket);
				if (idx !== -1) sockets.splice(idx, 1);
				if (sockets.length === 0) {
					bot.removeListener("move", onMove);
				}
			});
		});

		const cleanup = () => {
			bot.removeListener("move", onMove);
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
			const serverCards = Array.from(this.sessions.values())
				.map(s => {
					const bot = s.botInstance;
					const url = this.getViewerUrl(bot.config.id);
					return `
					<div class="card">
						<div class="card-header">
							<span class="status-dot"></span>
							<h3>${bot.config.name || bot.config.id}</h3>
						</div>
						<p class="server-host">Host: <code>${bot.config.connection.host}</code></p>
						<p class="bot-info">Bot: <strong>${bot.bot?.username || "mo0nbot"}</strong></p>
						<a class="btn" href="${url}" target="_blank">🎮 Mở 3D World Viewer</a>
					</div>`;
				})
				.join("\n");

			const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Minecraft Bot 3D World Viewer Hub</title>
	<style>
		body {
			font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
			background: #090d16;
			color: #e2e8f0;
			margin: 0;
			padding: 40px 20px;
			display: flex;
			flex-direction: column;
			align-items: center;
		}
		h1 { color: #38bdf8; margin-bottom: 8px; }
		p.desc { color: #94a3b8; margin-bottom: 32px; }
		.grid {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
			gap: 20px;
			max-width: 900px;
			width: 100%;
		}
		.card {
			background: #111827;
			border: 1px solid rgba(56, 189, 248, 0.2);
			border-radius: 12px;
			padding: 24px;
			display: flex;
			flex-direction: column;
			box-shadow: 0 10px 25px rgba(0,0,0,0.5);
		}
		.card-header {
			display: flex;
			align-items: center;
			gap: 10px;
			margin-bottom: 12px;
		}
		.card-header h3 { margin: 0; color: #f8fafc; font-size: 1.2rem; }
		.status-dot {
			width: 12px;
			height: 12px;
			background: #22c55e;
			border-radius: 50%;
			box-shadow: 0 0 10px #22c55e;
		}
		.server-host, .bot-info {
			margin: 4px 0;
			color: #94a3b8;
			font-size: 0.95rem;
		}
		code {
			background: #1f2937;
			padding: 2px 6px;
			border-radius: 4px;
			color: #38bdf8;
		}
		.btn {
			margin-top: 20px;
			background: #0284c7;
			color: #fff;
			text-decoration: none;
			text-align: center;
			padding: 12px;
			border-radius: 8px;
			font-weight: 600;
			transition: all 0.2s;
		}
		.btn:hover {
			background: #0369a1;
			box-shadow: 0 0 15px rgba(14, 165, 233, 0.5);
		}
		.empty {
			color: #64748b;
			text-align: center;
			grid-column: 1 / -1;
			font-size: 1.1rem;
		}
	</style>
</head>
<body>
	<h1>🌐 Minecraft Bot 3D World Viewer Hub</h1>
	<p class="desc">Chọn server để xem trực tiếp thế giới 3D và chunk xung quanh bot</p>
	<div class="grid">
		${serverCards || '<p class="empty">Hiện tại chưa có bot nào đang kết nối server.</p>'}
	</div>
</body>
</html>`;
			res.send(html);
		});
	}
}

export const viewerManager = ViewerManagerService.getInstance();
