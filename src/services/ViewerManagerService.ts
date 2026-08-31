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

		// 1. Serve custom HTML page for /viewer/:serverId
		this.app.get(prefix, (_req, res) => {
			res.send(this.renderViewerHtml(botInstance));
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
		const primitives: Record<string, any> = {};

		(bot as any).viewer = new EventEmitter();
		(bot as any).viewer.erase = (id: string) => {
			delete primitives[id];
			for (const s of sockets) s.emit("primitive", { id });
		};

		const broadcastStats = () => {
			const stats = this.getBotStats(botInstance);
			for (const s of sockets) {
				s.emit("stats_update", stats);
			}
		};

		const broadcastInventory = () => {
			const inv = this.getSerializedInventory(botInstance);
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
			socket.emit("version", bot.version);
			sockets.push(socket);

			const worldView = new WorldView(bot.world, viewDistance, bot.entity.position, socket);
			worldView.init(bot.entity.position);

			// Initial state packets
			socket.emit("stats_update", this.getBotStats(botInstance));
			socket.emit("inventory_update", this.getSerializedInventory(botInstance));

			// Prismarine Viewer native click event
			worldView.on("blockClicked", (block: any, face: any, button: any) => {
				(bot as any).viewer?.emit("blockClicked", block, face, button);
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
	 * Extract bot stats payload
	 */
	private getBotStats(botInstance: Minecraft) {
		const bot = botInstance.bot;
		if (!bot?.entity) {
			return {
				health: 0,
				food: 0,
				saturation: 0,
				totemCount: 0,
				antiAfk: false,
				isNavigating: false,
				pos: { x: 0, y: 0, z: 0 },
				mainHand: null,
			};
		}

		const totemCount = bot.inventory.items().filter((i) => i.name === "totem_of_undying").length;
		const mainHandItem = bot.inventory.slots[bot.getEquipmentDestSlot("hand")];

		return {
			health: Math.round(bot.health),
			food: Math.round(bot.food),
			saturation: Math.round(bot.foodSaturation || 0),
			totemCount,
			antiAfk: botInstance.antiAfkService?.isEnabled ?? false,
			isNavigating: botInstance.smartPathfinderService?.getIsNavigating() ?? false,
			currentGoal: botInstance.smartPathfinderService?.getCurrentGoal() ?? null,
			pos: {
				x: Math.round(bot.entity.position.x * 10) / 10,
				y: Math.round(bot.entity.position.y * 10) / 10,
				z: Math.round(bot.entity.position.z * 10) / 10,
			},
			mainHand: mainHandItem ? mainHandItem.name : null,
		};
	}

	/**
	 * Serialize full bot inventory (armor, offhand, 27 inventory slots, 9 hotbar slots)
	 */
	private getSerializedInventory(botInstance: Minecraft) {
		const bot = botInstance.bot;
		if (!bot?.inventory) {
			return { armor: [], offhand: null, main: [], hotbar: [] };
		}

		const serializeItem = (item: any) => {
			if (!item) return null;
			const maxDurability = item.maxDurability || 0;
			const durabilityUsed = item.durabilityUsed || 0;
			const durabilityLeft = maxDurability > 0 ? Math.max(0, maxDurability - durabilityUsed) : null;
			const durabilityPct = maxDurability > 0 ? Math.round(((maxDurability - durabilityUsed) / maxDurability) * 100) : null;

			const enchantments = (item.enchants || []).map((e: any) => ({
				name: e.name,
				lvl: e.lvl,
			}));

			return {
				name: item.name,
				displayName: item.displayName || item.name,
				count: item.count,
				slot: item.slot,
				maxDurability,
				durabilityLeft,
				durabilityPct,
				enchantments,
				customName: item.customName || null,
			};
		};

		// Armor slots (5: helmet, 6: chestplate, 7: leggings, 8: boots)
		const armor = [
			serializeItem(bot.inventory.slots[5]),
			serializeItem(bot.inventory.slots[6]),
			serializeItem(bot.inventory.slots[7]),
			serializeItem(bot.inventory.slots[8]),
		];

		// Offhand (slot 45)
		const offhand = serializeItem(bot.inventory.slots[45]);

		// Main Inventory (slots 9 to 35)
		const main = [];
		for (let i = 9; i <= 35; i++) {
			main.push(serializeItem(bot.inventory.slots[i]));
		}

		// Hotbar (slots 36 to 44)
		const hotbar = [];
		for (let i = 36; i <= 44; i++) {
			hotbar.push(serializeItem(bot.inventory.slots[i]));
		}

		return { armor, offhand, main, hotbar };
	}

	/**
	 * Setup HTML Hub at /viewer
	 */
	private setupHubRoutes(): void {
		this.app.get("/viewer", (_req, res) => {
			const serverCards = Array.from(this.sessions.values())
				.map((s) => {
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
						<a class="btn" href="${url}">🎮 Mở 3D World Viewer</a>
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
		h1 { color: #38bdf8; margin-bottom: 8px; font-size: 1.8rem; }
		p.desc { color: #94a3b8; margin-bottom: 32px; font-size: 1rem; }
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
			backdrop-filter: blur(8px);
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
	<p class="desc">Chọn server để xem trực tiếp thế giới 3D, Kho đồ trực quan & Click-to-Move</p>
	<div class="grid">
		${serverCards || '<p class="empty">Hiện tại chưa có bot nào đang kết nối server.</p>'}
	</div>
</body>
</html>`;
			res.send(html);
		});
	}

	/**
	 * Render the full 3D World Viewer HTML with Glassmorphism HUD, Inventory, Tooltips and Click-to-Move
	 */
	private renderViewerHtml(botInstance: Minecraft): string {
		const serverId = botInstance.config.id;
		const serverName = botInstance.config.name || serverId;
		const botUsername = botInstance.bot?.username || "mo0nbot";

		return `<!DOCTYPE html>
<html lang="vi">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${serverName} - 3D Viewer & Inventory HUD</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=VT323&display=swap" rel="stylesheet">
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
		html, body { width: 100%; height: 100%; overflow: hidden; background: #030712; font-family: 'Inter', sans-serif; color: #f8fafc; }
		canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; outline: none; }

		/* Top HUD Glassmorphism Bar */
		.top-hud {
			position: absolute;
			top: 16px;
			left: 16px;
			right: 16px;
			z-index: 10;
			display: flex;
			justify-content: space-between;
			align-items: center;
			background: rgba(15, 23, 42, 0.75);
			backdrop-filter: blur(16px);
			-webkit-backdrop-filter: blur(16px);
			border: 1px solid rgba(255, 255, 255, 0.12);
			border-radius: 16px;
			padding: 10px 20px;
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		}

		.bot-meta { display: flex; align-items: center; gap: 14px; }
		.bot-avatar {
			width: 38px;
			height: 38px;
			border-radius: 8px;
			background: #1e293b;
			border: 2px solid #38bdf8;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: bold;
			font-size: 1.1rem;
		}
		.bot-title h2 { font-size: 1rem; font-weight: 700; color: #f8fafc; line-height: 1.2; }
		.bot-title p { font-size: 0.8rem; color: #94a3b8; }

		/* Live Stats Badges */
		.stats-badges { display: flex; align-items: center; gap: 12px; }
		.stat-pill {
			display: flex;
			align-items: center;
			gap: 6px;
			background: rgba(30, 41, 59, 0.8);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 20px;
			padding: 6px 12px;
			font-size: 0.85rem;
			font-weight: 600;
		}
		.stat-pill.health { color: #f43f5e; }
		.stat-pill.food { color: #f59e0b; }
		.stat-pill.totem { color: #10b981; }
		.stat-pill.coords { color: #38bdf8; font-family: monospace; }

		/* Action Controls */
		.action-btns { display: flex; align-items: center; gap: 8px; }
		.btn-action {
			display: flex;
			align-items: center;
			gap: 6px;
			background: rgba(30, 41, 59, 0.9);
			color: #e2e8f0;
			border: 1px solid rgba(255, 255, 255, 0.15);
			padding: 8px 14px;
			border-radius: 10px;
			font-size: 0.85rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}
		.btn-action:hover { background: #334155; transform: translateY(-1px); }
		.btn-action.stop { background: #e11d48; color: #fff; border-color: #be123c; }
		.btn-action.stop:hover { background: #be123c; box-shadow: 0 0 15px rgba(225, 29, 72, 0.5); }
		.btn-action.active { background: #0284c7; color: #fff; border-color: #38bdf8; }

		/* Instructions Tip Overlay */
		.hints-hud {
			position: absolute;
			bottom: 16px;
			left: 16px;
			z-index: 10;
			background: rgba(15, 23, 42, 0.65);
			backdrop-filter: blur(12px);
			border: 1px solid rgba(255, 255, 255, 0.08);
			border-radius: 12px;
			padding: 8px 14px;
			font-size: 0.75rem;
			color: #94a3b8;
			display: flex;
			gap: 12px;
		}
		.hint-item strong { color: #38bdf8; }

		/* Glassmorphism Inventory Modal */
		.inventory-modal {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%) scale(0.95);
			z-index: 20;
			background: rgba(17, 24, 39, 0.88);
			backdrop-filter: blur(20px);
			-webkit-backdrop-filter: blur(20px);
			border: 1px solid rgba(255, 255, 255, 0.18);
			border-radius: 20px;
			padding: 24px;
			box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
			opacity: 0;
			pointer-events: none;
			transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
			max-width: 580px;
			width: 95%;
		}
		.inventory-modal.open {
			opacity: 1;
			pointer-events: auto;
			transform: translate(-50%, -50%) scale(1);
		}

		.inv-header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 18px;
			border-bottom: 1px solid rgba(255, 255, 255, 0.1);
			padding-bottom: 10px;
		}
		.inv-header h3 { font-size: 1.15rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
		.btn-close {
			background: rgba(255, 255, 255, 0.1);
			border: none;
			color: #94a3b8;
			font-size: 1.2rem;
			width: 28px;
			height: 28px;
			border-radius: 50%;
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.btn-close:hover { color: #fff; background: rgba(255, 255, 255, 0.2); }

		.inv-body { display: flex; flex-direction: column; gap: 16px; }
		.armor-offhand-row { display: flex; justify-content: space-between; align-items: center; }
		.armor-group { display: flex; gap: 8px; }
		.offhand-group { display: flex; gap: 8px; align-items: center; }
		.section-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }

		/* Slots Layout */
		.slot-grid { display: grid; gap: 6px; }
		.main-grid { grid-template-columns: repeat(9, 1fr); }
		.hotbar-grid { grid-template-columns: repeat(9, 1fr); margin-top: 8px; padding-top: 12px; border-top: 1px dashed rgba(255, 255, 255, 0.1); }

		.item-slot {
			width: 48px;
			height: 48px;
			background: rgba(30, 41, 59, 0.6);
			border: 1px solid rgba(255, 255, 255, 0.1);
			border-radius: 8px;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			position: relative;
			cursor: pointer;
			transition: all 0.15s ease;
		}
		.item-slot:hover {
			background: rgba(56, 189, 248, 0.15);
			border-color: #38bdf8;
			box-shadow: 0 0 10px rgba(56, 189, 248, 0.3);
		}
		.item-name-abbr { font-size: 0.7rem; font-weight: 600; text-align: center; color: #cbd5e1; word-break: break-word; line-height: 1; padding: 2px; }
		.item-count {
			position: absolute;
			bottom: 2px;
			right: 4px;
			font-family: 'VT323', monospace;
			font-size: 1.1rem;
			color: #fff;
			text-shadow: 1px 1px 2px #000;
		}
		.durability-bar {
			position: absolute;
			bottom: 1px;
			left: 3px;
			right: 3px;
			height: 3px;
			background: rgba(0,0,0,0.5);
			border-radius: 2px;
			overflow: hidden;
		}
		.durability-fill { height: 100%; border-radius: 2px; }

		/* Minecraft Hover Tooltip */
		.mc-tooltip {
			position: fixed;
			z-index: 100;
			background: #100010;
			border: 2px solid #2b0c54;
			border-radius: 6px;
			padding: 8px 12px;
			pointer-events: none;
			display: none;
			box-shadow: 0 4px 20px rgba(0,0,0,0.8);
			max-width: 260px;
		}
		.mc-tooltip h4 { font-size: 0.95rem; font-weight: 700; color: #55ffff; margin-bottom: 4px; }
		.mc-tooltip .ench-item { color: #aaa; font-size: 0.8rem; margin: 2px 0; }
		.mc-tooltip .durability-info { color: #ffff55; font-size: 0.8rem; margin-top: 4px; font-weight: 600; }
		.mc-tooltip .smart-tip { color: #55ff55; font-size: 0.75rem; margin-top: 4px; font-style: italic; }

		/* Toast Notification */
		.toast {
			position: absolute;
			bottom: 60px;
			left: 50%;
			transform: translateX(-50%) translateY(20px);
			background: rgba(15, 23, 42, 0.9);
			border: 1px solid #38bdf8;
			border-radius: 10px;
			padding: 10px 20px;
			font-size: 0.9rem;
			font-weight: 600;
			color: #f8fafc;
			box-shadow: 0 8px 24px rgba(0,0,0,0.5);
			opacity: 0;
			transition: all 0.3s ease;
			z-index: 30;
			pointer-events: none;
		}
		.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
	</style>
</head>
<body>
	<!-- Top Bar HUD -->
	<div class="top-hud">
		<div class="bot-meta">
			<div class="bot-avatar">🤖</div>
			<div class="bot-title">
				<h2>${botUsername}</h2>
				<p>${serverName}</p>
			</div>
		</div>

		<div class="stats-badges">
			<div class="stat-pill health">❤️ <span id="stat-hp">20</span>/20</div>
			<div class="stat-pill food">🍖 <span id="stat-food">20</span>/20</div>
			<div class="stat-pill totem">🛡️ Totem: <span id="stat-totem">0</span></div>
			<div class="stat-pill coords">📍 <span id="stat-coords">0, 0, 0</span></div>
		</div>

		<div class="action-btns">
			<button class="btn-action stop" id="btn-stop" title="Dừng khẩn cấp mọi di chuyển">🛑 Dừng</button>
			<button class="btn-action" id="btn-inv" title="Mở kho đồ (Phím E)">🎒 Kho đồ (E)</button>
			<button class="btn-action" id="btn-afk" title="Bật/Tắt chống AFK">💤 Anti-AFK</button>
			<button class="btn-action" id="btn-totem" title="Trang bị Totem tay phụ">🛡️ Lắp Totem</button>
			<button class="btn-action" id="btn-eat" title="Ăn ngay lập tức">🍖 Ăn đồ</button>
		</div>
	</div>

	<!-- Bottom Tip -->
	<div class="hints-hud">
		<div class="hint-item">🎯 <strong>Chuột Trái:</strong> Click-to-Move</div>
		<div class="hint-item">🔄 <strong>Chuột Phải + Kéo:</strong> Xoay Camera</div>
		<div class="hint-item">🎒 <strong>Phím E:</strong> Bật/Tắt Kho đồ</div>
	</div>

	<!-- Inventory Modal -->
	<div class="inventory-modal" id="inventory-modal">
		<div class="inv-header">
			<h3>🎒 Kho Đồ & Trang Bị Bot</h3>
			<button class="btn-close" id="btn-close-inv">&times;</button>
		</div>
		<div class="inv-body">
			<div class="armor-offhand-row">
				<div>
					<div class="section-label">Giáp Bảo Hộ</div>
					<div class="armor-group" id="armor-slots"></div>
				</div>
				<div>
					<div class="section-label">Tay Phụ (Offhand)</div>
					<div class="offhand-group" id="offhand-slot"></div>
				</div>
			</div>

			<div>
				<div class="section-label">Balo Chính (27 Slots)</div>
				<div class="slot-grid main-grid" id="main-slots"></div>
			</div>

			<div>
				<div class="section-label">Thanh Hotbar (9 Slots)</div>
				<div class="slot-grid hotbar-grid" id="hotbar-slots"></div>
			</div>
		</div>
	</div>

	<!-- Minecraft Hover Tooltip -->
	<div class="mc-tooltip" id="mc-tooltip">
		<h4 id="tt-title">Item Name</h4>
		<div id="tt-enchants"></div>
		<div id="tt-durability" class="durability-info"></div>
		<div id="tt-tip" class="smart-tip"></div>
	</div>

	<!-- Toast -->
	<div class="toast" id="toast"></div>

	<!-- Prismarine Viewer Scripts -->
	<script type="text/javascript" src="/viewer/${serverId}/index.js"></script>

	<!-- Interactive Client Logic -->
	<script>
		const socket = io({ path: "/viewer/${serverId}/socket.io" });
		const invModal = document.getElementById("inventory-modal");
		const btnInv = document.getElementById("btn-inv");
		const btnCloseInv = document.getElementById("btn-close-inv");
		const btnStop = document.getElementById("btn-stop");
		const btnAfk = document.getElementById("btn-afk");
		const btnTotem = document.getElementById("btn-totem");
		const btnEat = document.getElementById("btn-eat");
		const tooltip = document.getElementById("mc-tooltip");
		const toast = document.getElementById("toast");

		function showToast(msg) {
			toast.innerText = msg;
			toast.classList.add("show");
			setTimeout(() => toast.classList.remove("show"), 2500);
		}

		// Inventory toggle
		function toggleInventory(open) {
			const isOpen = typeof open === "boolean" ? open : !invModal.classList.contains("open");
			if (isOpen) {
				invModal.classList.add("open");
				localStorage.setItem("viewer_inv_open", "true");
			} else {
				invModal.classList.remove("open");
				localStorage.setItem("viewer_inv_open", "false");
			}
		}

		btnInv.addEventListener("click", () => toggleInventory());
		btnCloseInv.addEventListener("click", () => toggleInventory(false));

		// Keyboard shortcut E
		window.addEventListener("keydown", (e) => {
			if (e.key === "e" || e.key === "E") {
				if (document.activeElement.tagName !== "INPUT") {
					toggleInventory();
				}
			} else if (e.key === "Escape") {
				toggleInventory(false);
			}
		});

		// Restore localStorage
		if (localStorage.getItem("viewer_inv_open") === "true") {
			toggleInventory(true);
		}

		// Buttons actions
		btnStop.addEventListener("click", () => {
			socket.emit("emergency_stop");
			showToast("🛑 Đã dừng khẩn cấp!");
		});

		btnAfk.addEventListener("click", () => {
			socket.emit("toggle_anti_afk");
		});

		btnTotem.addEventListener("click", () => {
			socket.emit("trigger_totem");
		});

		btnEat.addEventListener("click", () => {
			socket.emit("trigger_eat");
		});

		socket.on("action_feedback", (data) => {
			if (data && data.message) showToast(data.message);
		});

		// Live Stats Update
		socket.on("stats_update", (data) => {
			if (!data) return;
			document.getElementById("stat-hp").innerText = data.health ?? 0;
			document.getElementById("stat-food").innerText = data.food ?? 0;
			document.getElementById("stat-totem").innerText = data.totemCount ?? 0;
			if (data.pos) {
				document.getElementById("stat-coords").innerText = data.pos.x + ", " + data.pos.y + ", " + data.pos.z;
			}
			if (data.antiAfk) {
				btnAfk.classList.add("active");
				btnAfk.innerText = "💤 Anti-AFK: Bật";
			} else {
				btnAfk.classList.remove("active");
				btnAfk.innerText = "💤 Anti-AFK: Tắt";
			}
		});

		// Render Item Slot
		function renderSlot(item, placeholder) {
			const div = document.createElement("div");
			div.className = "item-slot";

			if (!item) {
				if (placeholder) {
					div.innerHTML = '<span class="item-name-abbr" style="color: #475569;">' + placeholder + '</span>';
				}
				return div;
			}

			const abbr = item.displayName || item.name.replace(/_/g, " ");
			let html = '<span class="item-name-abbr">' + abbr.substring(0, 10) + '</span>';

			if (item.count > 1) {
				html += '<span class="item-count">' + item.count + '</span>';
			}

			if (item.durabilityPct !== null) {
				const pct = item.durabilityPct;
				const color = pct > 50 ? '#22c55e' : (pct > 20 ? '#eab308' : '#ef4444');
				html += '<div class="durability-bar"><div class="durability-fill" style="width:' + pct + '%; background:' + color + '"></div></div>';
			}

			div.innerHTML = html;

			// Tooltip events
			div.addEventListener("mouseenter", (e) => showTooltip(item, e));
			div.addEventListener("mousemove", (e) => moveTooltip(e));
			div.addEventListener("mouseleave", hideTooltip);

			return div;
		}

		// Tooltip Logic
		function showTooltip(item, e) {
			document.getElementById("tt-title").innerText = item.displayName || item.name;
			
			const enchDiv = document.getElementById("tt-enchants");
			enchDiv.innerHTML = "";
			if (item.enchantments && item.enchantments.length > 0) {
				for (const enc of item.enchantments) {
					const p = document.createElement("div");
					p.className = "ench-item";
					p.innerText = enc.name + " " + enc.lvl;
					enchDiv.appendChild(p);
				}
			}

			const durDiv = document.getElementById("tt-durability");
			if (item.maxDurability) {
				durDiv.innerText = "Độ bền: " + item.durabilityLeft + " / " + item.maxDurability;
				durDiv.style.display = "block";
			} else {
				durDiv.style.display = "none";
			}

			const tipDiv = document.getElementById("tt-tip");
			if (item.name === "totem_of_undying") {
				tipDiv.innerText = "🌟 Đang được giữ ở tay phụ bảo vệ mạng";
				tipDiv.style.display = "block";
			} else if (item.name.includes("golden_carrot") || item.name.includes("cooked_")) {
				tipDiv.innerText = "🍖 Thức ăn hồi máu & độ bão hòa cao";
				tipDiv.style.display = "block";
			} else {
				tipDiv.style.display = "none";
			}

			tooltip.style.display = "block";
			moveTooltip(e);
		}

		function moveTooltip(e) {
			tooltip.style.left = (e.clientX + 14) + "px";
			tooltip.style.top = (e.clientY + 14) + "px";
		}

		function hideTooltip() {
			tooltip.style.display = "none";
		}

		// Inventory Sync
		socket.on("inventory_update", (data) => {
			if (!data) return;

			// Armor
			const armorContainer = document.getElementById("armor-slots");
			armorContainer.innerHTML = "";
			const armorLabels = ["Mũ", "Áo", "Quần", "Giày"];
			for (let i = 0; i < 4; i++) {
				armorContainer.appendChild(renderSlot(data.armor ? data.armor[i] : null, armorLabels[i]));
			}

			// Offhand
			const offhandContainer = document.getElementById("offhand-slot");
			offhandContainer.innerHTML = "";
			offhandContainer.appendChild(renderSlot(data.offhand, "Tay Phụ"));

			// Main
			const mainContainer = document.getElementById("main-slots");
			mainContainer.innerHTML = "";
			for (let i = 0; i < 27; i++) {
				mainContainer.appendChild(renderSlot(data.main ? data.main[i] : null, ""));
			}

			// Hotbar
			const hotbarContainer = document.getElementById("hotbar-slots");
			hotbarContainer.innerHTML = "";
			for (let i = 0; i < 9; i++) {
				hotbarContainer.appendChild(renderSlot(data.hotbar ? data.hotbar[i] : null, (i + 1).toString()));
			}
		});
	</script>
</body>
</html>`;
	}
}

export const viewerManager = ViewerManagerService.getInstance();
