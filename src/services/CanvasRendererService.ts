import { createCanvas, loadImage, Image, SKRSContext2D } from "@napi-rs/canvas";
import axios from "axios";
import { Minecraft } from "../structures";
import { Server } from "../typings/types";
import { RedisManager } from "../redis/RedisManager";

interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export class CanvasRendererService {
	private static avatarCache = new Map<string, CacheEntry<Buffer>>();
	private static tablistImageCache = new Map<string, CacheEntry<Buffer>>();
	private static coordsImageCache = new Map<string, CacheEntry<{ buffer: Buffer; x: number; y: number; z: number }>>();

	private static readonly AVATAR_TTL_MS = 10 * 60 * 1000; // 10 minutes
	private static readonly TABLIST_TTL_MS = 4 * 1000; // 4 seconds
	private static readonly COORDS_TTL_MS = 2 * 1000; // 2 seconds

	/**
	 * Render visual Tablist Scoreboard card with Multi-tier Caching (Memory L1 + Redis L2)
	 */
	public static async renderTablist(botInstance: Minecraft): Promise<Buffer> {
		const host = botInstance.config.connection.host;
		const now = Date.now();

		// 1. Check L1 In-Memory Cache
		const memCached = this.tablistImageCache.get(host);
		if (memCached && memCached.expiry > now) {
			return memCached.data;
		}

		// 2. Check L2 Redis Cache
		const redisKey = `cache:tablist:${host.toLowerCase()}`;
		const redisCached = await RedisManager.getBuffer(redisKey);
		if (redisCached) {
			this.tablistImageCache.set(host, {
				data: redisCached,
				expiry: now + this.TABLIST_TTL_MS,
			});
			return redisCached;
		}

		const bot = botInstance.bot;
		const rawPlayers = bot?.players ? Object.values(bot.players) : [];
		const playerCount = rawPlayers.length;

		// Clean header & footer text
		const tlHeader = bot?.tablist?.header;
		const tlFooter = bot?.tablist?.footer;
		const rawHeader = (typeof tlHeader === "object" && tlHeader !== null && "json" in tlHeader && (tlHeader as { json?: { text?: string } }).json?.text)
			|| tlHeader?.toString()
			|| "";
		const rawFooter = (typeof tlFooter === "object" && tlFooter !== null && "json" in tlFooter && (tlFooter as { json?: { text?: string } }).json?.text)
			|| tlFooter?.toString()
			|| "";

		const headerLines = this.cleanAndSplit(rawHeader);
		const footerLines = this.cleanAndSplit(rawFooter);

		// Grid layout calculation
		const columns = playerCount > 60 ? 4 : playerCount > 24 ? 3 : playerCount > 8 ? 2 : 1;
		const columnWidth = 240;
		const rowHeight = 36;
		const gap = 8;
		const padding = 20;

		const rows = Math.ceil(playerCount / columns) || 1;
		const playersHeight = rows * (rowHeight + gap);

		const headerHeight = headerLines.length > 0 ? headerLines.length * 20 + 24 : 0;
		const footerHeight = footerLines.length > 0 ? footerLines.length * 18 + 24 : 0;
		const titleHeight = 50;

		const width = Math.max(540, columns * columnWidth + (columns - 1) * gap + padding * 2);
		const height = padding * 2 + titleHeight + headerHeight + playersHeight + footerHeight;

		const canvas = createCanvas(width, height);
		const ctx: SKRSContext2D = canvas.getContext("2d");

		// Background: Dark gradient with border
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, "#11141c");
		gradient.addColorStop(1, "#0a0c12");
		ctx.fillStyle = gradient;
		this.roundRect(ctx, 0, 0, width, height, 16);
		ctx.fill();

		// Glowing outer stroke
		ctx.strokeStyle = "rgba(59, 130, 246, 0.4)";
		ctx.lineWidth = 2;
		this.roundRect(ctx, 1, 1, width - 2, height - 2, 16);
		ctx.stroke();

		let currentY = padding;

		// 1. Title Bar
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
		ctx.textAlign = "left";
		ctx.fillText(`📊 Tablist - ${host}`, padding, currentY + 24);

		ctx.fillStyle = "#38bdf8";
		ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
		ctx.textAlign = "right";
		ctx.fillText(`Online: ${playerCount} players`, width - padding, currentY + 24);

		currentY += titleHeight;

		// 2. Header (if any)
		if (headerLines.length > 0) {
			ctx.textAlign = "center";
			ctx.font = "14px 'Segoe UI', Arial, sans-serif";
			ctx.fillStyle = "#cbd5e1";
			for (const line of headerLines) {
				ctx.fillText(line, width / 2, currentY + 14);
				currentY += 20;
			}
			currentY += 12;
		}

		// 3. Players Grid
		ctx.textAlign = "left";
		const startX = padding;
		const startY = currentY;

		// Fetch avatars concurrently
		const playerItems = rawPlayers.slice(0, 120); // Cap at 120 for visual space
		const avatarPromises = playerItems.map(p => this.getAvatarImage(p.username));
		const avatars = await Promise.all(avatarPromises);

		for (let i = 0; i < playerItems.length; i++) {
			const player = playerItems[i];
			const avatar = avatars[i];

			const col = i % columns;
			const row = Math.floor(i / columns);

			const itemX = startX + col * (columnWidth + gap);
			const itemY = startY + row * (rowHeight + gap);

			// Item card background
			ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
			this.roundRect(ctx, itemX, itemY, columnWidth, rowHeight, 8);
			ctx.fill();

			// Draw Avatar Head
			if (avatar) {
				ctx.save();
				this.roundRect(ctx, itemX + 4, itemY + 4, 28, 28, 6);
				ctx.clip();
				ctx.drawImage(avatar, itemX + 4, itemY + 4, 28, 28);
				ctx.restore();
			} else {
				ctx.fillStyle = "#334155";
				this.roundRect(ctx, itemX + 4, itemY + 4, 28, 28, 6);
				ctx.fill();
			}

			// Draw Username
			ctx.fillStyle = "#f8fafc";
			ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
			const cleanName = (player.displayName ? player.displayName.toString() : player.username)
				.replace(/\u00A7[0-9A-FK-OR]/gi, "");
			ctx.fillText(this.truncateText(cleanName, 18), itemX + 38, itemY + 22);

			// Draw Ping Indicator
			const ping = player.ping ?? 0;
			const pingColor = ping < 80 ? "#22c55e" : ping < 180 ? "#eab308" : "#ef4444";
			ctx.fillStyle = pingColor;
			ctx.font = "11px 'Segoe UI', Arial, sans-serif";
			ctx.textAlign = "right";
			ctx.fillText(`${ping}ms`, itemX + columnWidth - 8, itemY + 22);
			ctx.textAlign = "left";
		}

		currentY = startY + playersHeight;

		// 4. Footer (if any)
		if (footerLines.length > 0) {
			currentY += 10;
			ctx.textAlign = "center";
			ctx.font = "13px 'Segoe UI', Arial, sans-serif";
			ctx.fillStyle = "#94a3b8";
			for (const line of footerLines) {
				ctx.fillText(line, width / 2, currentY + 14);
				currentY += 18;
			}
		}

		const buffer = canvas.toBuffer("image/png");

		// Save to L1 Cache & L2 Redis Cache
		this.tablistImageCache.set(host, {
			data: buffer,
			expiry: now + this.TABLIST_TTL_MS,
		});
		await RedisManager.setBuffer(redisKey, buffer, 4);

		return buffer;
	}

	/**
	 * Render visual Coordinates & Status HUD card with Multi-tier Caching (Memory L1 + Redis L2)
	 */
	public static async renderCoordinates(botInstance: Minecraft): Promise<Buffer> {
		const host = botInstance.config.connection.host;
		const now = Date.now();

		const bot = botInstance.bot;
		const pos = bot?.entity?.position;
		const x = pos ? Math.round(pos.x * 10) / 10 : 0;
		const y = pos ? Math.round(pos.y * 10) / 10 : 0;
		const z = pos ? Math.round(pos.z * 10) / 10 : 0;

		// 1. Check L1 Memory Cache
		const cached = this.coordsImageCache.get(host);
		if (
			cached &&
			cached.expiry > now &&
			Math.abs(cached.data.x - x) < 0.5 &&
			Math.abs(cached.data.y - y) < 0.5 &&
			Math.abs(cached.data.z - z) < 0.5
		) {
			return cached.data.buffer;
		}

		// 2. Check L2 Redis Cache
		const redisKey = `cache:coords:${host.toLowerCase()}`;
		const redisCached = await RedisManager.getBuffer(redisKey);
		if (redisCached) {
			this.coordsImageCache.set(host, {
				data: { buffer: redisCached, x, y, z },
				expiry: now + this.COORDS_TTL_MS,
			});
			return redisCached;
		}

		const width = 640;
		const height = 360;
		const canvas = createCanvas(width, height);
		const ctx: SKRSContext2D = canvas.getContext("2d");

		// Background Gradient
		const bg = ctx.createLinearGradient(0, 0, width, height);
		bg.addColorStop(0, "#0f172a");
		bg.addColorStop(1, "#020617");
		ctx.fillStyle = bg;
		this.roundRect(ctx, 0, 0, width, height, 16);
		ctx.fill();

		// Border
		ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
		ctx.lineWidth = 2;
		this.roundRect(ctx, 1, 1, width - 2, height - 2, 16);
		ctx.stroke();

		// Header
		ctx.fillStyle = "#ffffff";
		ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`📍 Bot Coordinates & HUD - ${botInstance.config.name || host}`, 24, 38);

		// Status Badge
		const isMain = botInstance.currentServer === Server.Main;
		const statusText = isMain ? "🟢 MAIN SERVER" : "🟡 IN QUEUE";
		const statusColor = isMain ? "#22c55e" : "#f59e0b";

		ctx.fillStyle = statusColor;
		ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
		ctx.textAlign = "right";
		ctx.fillText(statusText, width - 24, 38);
		ctx.textAlign = "left";

		// Bot Skin Head
		const avatarImg = await this.getAvatarImage(bot?.username || "mo0nbot");
		if (avatarImg) {
			ctx.save();
			this.roundRect(ctx, 24, 60, 64, 64, 12);
			ctx.clip();
			ctx.drawImage(avatarImg, 24, 60, 64, 64);
			ctx.restore();
		}

		// Bot Name & Dimension Info
		const rawDimension = String(bot?.game?.dimension || "minecraft:overworld");
		const dimName = rawDimension.includes("nether")
			? "🔥 The Nether"
			: rawDimension.includes("end")
			? "🌌 The End"
			: "🍀 Overworld";
		const dimColor = rawDimension.includes("nether")
			? "#ef4444"
			: rawDimension.includes("end")
			? "#a855f7"
			: "#10b981";

		ctx.fillStyle = "#f8fafc";
		ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(bot?.username || "mo0nbot", 100, 85);

		ctx.fillStyle = dimColor;
		ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(dimName, 100, 110);

		// 1. Primary Coordinates Card (X, Y, Z)
		ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
		this.roundRect(ctx, 24, 140, 380, 100, 12);
		ctx.fill();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
		ctx.lineWidth = 1;
		this.roundRect(ctx, 24, 140, 380, 100, 12);
		ctx.stroke();

		ctx.fillStyle = "#94a3b8";
		ctx.font = "12px 'Segoe UI', Arial, sans-serif";
		ctx.fillText("CURRENT POSITION (XYZ)", 38, 162);

		ctx.fillStyle = "#38bdf8";
		ctx.font = "bold 26px 'Segoe UI', Arial, monospace";
		ctx.fillText(`X: ${x}`, 38, 198);
		ctx.fillStyle = "#4ade80";
		ctx.fillText(`Y: ${y}`, 160, 198);
		ctx.fillStyle = "#f472b6";
		ctx.fillText(`Z: ${z}`, 275, 198);

		// Converted Coordinates (Overworld <-> Nether)
		const isNether = rawDimension.includes("nether");
		const convX = isNether ? Math.round(x * 8) : Math.round(x / 8);
		const convZ = isNether ? Math.round(z * 8) : Math.round(z / 8);
		const convLabel = isNether ? "Overworld Equivalent:" : "Nether Equivalent (X/8, Z/8):";

		ctx.fillStyle = "#64748b";
		ctx.font = "12px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`${convLabel} X: ${convX}, Z: ${convZ}`, 38, 226);

		// 2. Facing / Compass Direction Card
		ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
		this.roundRect(ctx, 420, 140, 196, 100, 12);
		ctx.fill();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
		ctx.lineWidth = 1;
		this.roundRect(ctx, 420, 140, 196, 100, 12);
		ctx.stroke();

		const yaw = bot?.entity?.yaw ? ((bot.entity.yaw * 180) / Math.PI) : 0;
		const pitch = bot?.entity?.pitch ? ((bot.entity.pitch * 180) / Math.PI) : 0;
		const facing = this.getYawFacing(yaw);

		ctx.fillStyle = "#94a3b8";
		ctx.font = "12px 'Segoe UI', Arial, sans-serif";
		ctx.fillText("FACING DIRECTION", 434, 162);

		ctx.fillStyle = "#facc15";
		ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`🧭 ${facing.label}`, 434, 194);

		ctx.fillStyle = "#64748b";
		ctx.font = "11px 'Segoe UI', Arial, monospace";
		ctx.fillText(`Yaw: ${Math.round(yaw)}° | Pitch: ${Math.round(pitch)}°`, 434, 222);

		// 3. Health & Food Bars
		const health = Math.max(0, Math.min(20, bot?.health ?? 20));
		const food = Math.max(0, Math.min(20, bot?.food ?? 20));

		// Health Bar
		ctx.fillStyle = "#94a3b8";
		ctx.font = "13px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`❤️ Health: ${Math.round(health)} / 20`, 24, 272);

		ctx.fillStyle = "#1e293b";
		this.roundRect(ctx, 24, 282, 280, 14, 7);
		ctx.fill();
		ctx.fillStyle = "#ef4444";
		this.roundRect(ctx, 24, 282, Math.max(14, (health / 20) * 280), 14, 7);
		ctx.fill();

		// Food Bar
		ctx.fillStyle = "#94a3b8";
		ctx.font = "13px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`🍖 Hunger: ${Math.round(food)} / 20`, 336, 272);

		ctx.fillStyle = "#1e293b";
		this.roundRect(ctx, 336, 282, 280, 14, 7);
		ctx.fill();
		ctx.fillStyle = "#eab308";
		this.roundRect(ctx, 336, 282, Math.max(14, (food / 20) * 280), 14, 7);
		ctx.fill();

		// Footer Bar
		const connectedSince = botInstance.uptime
			? `Connected: ${Math.floor((now - botInstance.uptime) / 60000)}m ago`
			: "Connected: Recently";
		ctx.fillStyle = "#64748b";
		ctx.font = "12px 'Segoe UI', Arial, sans-serif";
		ctx.fillText(`Bot Uptime: ${connectedSince} | Server: ${botInstance.config.connection.host}`, 24, 336);

		const buffer = canvas.toBuffer("image/png");

		// Save to L1 Cache & L2 Redis Cache
		this.coordsImageCache.set(host, {
			data: { buffer, x, y, z },
			expiry: now + this.COORDS_TTL_MS,
		});
		await RedisManager.setBuffer(redisKey, buffer, 2);

		return buffer;
	}

	/**
	 * Get avatar image buffer with 10-minute Multi-tier cache (L1 Memory + L2 Redis) & fallback
	 */
	private static async getAvatarImage(username: string): Promise<Image | null> {
		const lowerUser = username.toLowerCase().trim();
		const now = Date.now();

		let buffer: Buffer | null = null;

		// 1. Check L1 Memory Cache
		const memCached = this.avatarCache.get(lowerUser);
		if (memCached && memCached.expiry > now) {
			buffer = memCached.data;
		} else {
			// 2. Check L2 Redis Cache
			const redisKey = `cache:avatar:${lowerUser}`;
			const redisCached = await RedisManager.getBuffer(redisKey);

			if (redisCached) {
				buffer = redisCached;
				this.avatarCache.set(lowerUser, {
					data: buffer,
					expiry: now + this.AVATAR_TTL_MS,
				});
			} else {
				// 3. Fetch from Network
				try {
					const res = await axios.get(`https://mc-heads.net/avatar/${encodeURIComponent(username)}/32.png`, {
						responseType: "arraybuffer",
						timeout: 2500,
					});
					buffer = Buffer.from(res.data as ArrayBuffer);
					this.avatarCache.set(lowerUser, {
						data: buffer,
						expiry: now + this.AVATAR_TTL_MS,
					});
					await RedisManager.setBuffer(redisKey, buffer, 600);
				} catch {
					// Fallback to minotar
					try {
						const res = await axios.get(`https://minotar.net/avatar/${encodeURIComponent(username)}/32.png`, {
							responseType: "arraybuffer",
							timeout: 2000,
						});
						buffer = Buffer.from(res.data as ArrayBuffer);
						this.avatarCache.set(lowerUser, {
							data: buffer,
							expiry: now + this.AVATAR_TTL_MS,
						});
						await RedisManager.setBuffer(redisKey, buffer, 600);
					} catch {
						buffer = null;
					}
				}
			}
		}

		if (!buffer) return null;
		try {
			return await loadImage(buffer);
		} catch {
			return null;
		}
	}

	private static getYawFacing(yawDeg: number): { label: string; axis: string } {
		const norm = ((yawDeg % 360) + 360) % 360;
		if (norm >= 45 && norm < 135) return { label: "West (-X)", axis: "-X" };
		if (norm >= 135 && norm < 225) return { label: "North (-Z)", axis: "-Z" };
		if (norm >= 225 && norm < 315) return { label: "East (+X)", axis: "+X" };
		return { label: "South (+Z)", axis: "+Z" };
	}

	private static cleanAndSplit(text: string): string[] {
		if (!text) return [];
		return text
			.replace(/\u00A7[0-9A-FK-OR]/gi, "")
			.split("\n")
			.map(s => s.trim())
			.filter(s => s.length > 0);
	}

	private static truncateText(str: string, maxLen: number): string {
		return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
	}

	private static roundRect(
		ctx: SKRSContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		radius: number
	): void {
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.lineTo(x + width - radius, y);
		ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
		ctx.lineTo(x + width, y + height - radius);
		ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
		ctx.lineTo(x + radius, y + height);
		ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
		ctx.lineTo(x, y + radius);
		ctx.quadraticCurveTo(x, y, x + radius, y);
		ctx.closePath();
	}
}
