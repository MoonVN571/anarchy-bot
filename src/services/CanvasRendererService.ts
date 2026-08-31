import { createCanvas, loadImage, Image, SKRSContext2D } from "@napi-rs/canvas";
import axios from "axios";
import { Minecraft } from "../structures";
import { Server } from "../typings/types";
import { RedisManager } from "../redis/RedisManager";
import { ChatParser, MINECRAFT_COLOR_MAP } from "../utils/chatParser";

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
	 * Render visual Tablist Scoreboard card with in-game Minecraft GUI style, bot world background, and Multi-tier Caching
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
		const redisKey = `anarchy:cache:tablist:${host.toLowerCase()}`;
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

		// Extract raw formatted header & footer
		const tlHeader = bot?.tablist?.header;
		const tlFooter = bot?.tablist?.footer;
		const rawHeader = (typeof tlHeader === "object" && tlHeader !== null && "json" in tlHeader && (tlHeader as { json?: { text?: string } }).json?.text)
			|| tlHeader?.toString()
			|| "";
		const rawFooter = (typeof tlFooter === "object" && tlFooter !== null && "json" in tlFooter && (tlFooter as { json?: { text?: string } }).json?.text)
			|| tlFooter?.toString()
			|| "";

		const rawHeaderLines = rawHeader ? rawHeader.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];
		const rawFooterLines = rawFooter ? rawFooter.split("\n").map(s => s.trim()).filter(s => s.length > 0) : [];

		// Grid layout calculation (1 to 4 columns, Minecraft in-game proportions)
		const columns = playerCount > 60 ? 4 : playerCount > 24 ? 3 : playerCount > 8 ? 2 : 1;
		const columnWidth = 260;
		const rowHeight = 32;
		const gapX = 6;
		const gapY = 4;
		const padding = 24;

		const rows = Math.ceil(Math.min(playerCount, 120) / columns) || 1;
		const playersHeight = rows * (rowHeight + gapY);

		const headerHeight = rawHeaderLines.length > 0 ? rawHeaderLines.length * 20 + 16 : 0;
		const footerHeight = rawFooterLines.length > 0 ? rawFooterLines.length * 18 + 20 : 0;
		const titleHeight = 44;

		const innerWidth = columns * columnWidth + (columns - 1) * gapX;
		const width = Math.max(620, innerWidth + padding * 2);
		const height = padding * 2 + titleHeight + headerHeight + playersHeight + footerHeight;

		const canvas = createCanvas(width, height);
		const ctx: SKRSContext2D = canvas.getContext("2d");

		// 1. Draw In-Game World Background from Bot Surroundings
		this.drawWorldBackground(ctx, width, height, botInstance);

		// 2. Draw Translucent Minecraft Tablist Window Overlay
		const guiX = Math.floor((width - (innerWidth + 24)) / 2);
		const guiY = padding - 10;
		const guiW = innerWidth + 24;
		const guiH = height - (padding * 2) + 20;

		ctx.fillStyle = "rgba(0, 0, 0, 0.70)";
		this.roundRect(ctx, guiX, guiY, guiW, guiH, 8);
		ctx.fill();

		ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
		ctx.lineWidth = 1;
		this.roundRect(ctx, guiX, guiY, guiW, guiH, 8);
		ctx.stroke();

		let currentY = padding;

		// 3. Title & Server Info
		const titleText = `§e§l${host.toUpperCase()} §7- §fTABLIST`;
		const countText = `§a${playerCount} §7players online`;
		this.drawMinecraftFormattedLine(ctx, titleText, guiX + 16, currentY + 16, false, "bold 17px 'Segoe UI', Arial, sans-serif");
		this.drawMinecraftFormattedLine(ctx, countText, guiX + guiW - 16, currentY + 16, false, "bold 14px 'Segoe UI', Arial, sans-serif", "right");

		currentY += titleHeight;

		// 4. Header (Minecraft formatted)
		if (rawHeaderLines.length > 0) {
			for (const line of rawHeaderLines) {
				this.drawMinecraftFormattedLine(ctx, line, width / 2, currentY + 12, true, "14px 'Segoe UI', Arial, sans-serif", "center");
				currentY += 20;
			}
			currentY += 10;
		}

		// 5. Player Grid (In-game slot style)
		const startX = Math.floor((width - innerWidth) / 2);
		const startY = currentY;

		const playerItems = rawPlayers.slice(0, 120);
		const avatarPromises = playerItems.map(p => this.getAvatarImage(p.username));
		const avatars = await Promise.all(avatarPromises);

		for (let i = 0; i < playerItems.length; i++) {
			const player = playerItems[i];
			const avatar = avatars[i];

			const col = i % columns;
			const row = Math.floor(i / columns);

			const itemX = startX + col * (columnWidth + gapX);
			const itemY = startY + row * (rowHeight + gapY);

			// Slot Background (Minecraft In-Game Translucent Box)
			ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
			this.roundRect(ctx, itemX, itemY, columnWidth, rowHeight, 4);
			ctx.fill();

			// Subtle highlight & shadow borders
			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;
			this.roundRect(ctx, itemX, itemY, columnWidth, rowHeight, 4);
			ctx.stroke();

			// Draw Skin Head (24x24)
			const headSize = 24;
			const headX = itemX + 4;
			const headY = itemY + 4;

			if (avatar) {
				ctx.save();
				this.roundRect(ctx, headX, headY, headSize, headSize, 3);
				ctx.clip();
				ctx.drawImage(avatar, headX, headY, headSize, headSize);
				ctx.restore();
			} else {
				ctx.fillStyle = "#334155";
				this.roundRect(ctx, headX, headY, headSize, headSize, 3);
				ctx.fill();
			}

			// Draw Display Name / Username with Minecraft format colors and drop-shadow
			const rawDisplayName = (player.displayName ? player.displayName.toString() : player.username) || player.username;
			const nameX = itemX + 34;
			const nameY = itemY + 20;

			// Truncate if too long to leave room for ping
			const maxNameWidth = columnWidth - 85;
			this.drawMinecraftFormattedLine(
				ctx,
				rawDisplayName,
				nameX,
				nameY,
				false,
				"bold 13px 'Segoe UI', Arial, sans-serif",
				"left",
				maxNameWidth
			);

			// Draw Ping in ms (e.g. 45ms, 120ms, 250ms)
			const ping = player.ping ?? 0;
			const pingFormatted = ping < 80
				? `§a${ping}ms`
				: ping < 180
				? `§e${ping}ms`
				: `§c${ping}ms`;

			const pingX = itemX + columnWidth - 8;
			this.drawMinecraftFormattedLine(
				ctx,
				pingFormatted,
				pingX,
				nameY,
				false,
				"bold 12px 'Segoe UI', Arial, monospace",
				"right"
			);
		}

		currentY = startY + playersHeight;

		// 6. Footer (Minecraft formatted)
		if (rawFooterLines.length > 0) {
			currentY += 8;
			for (const line of rawFooterLines) {
				this.drawMinecraftFormattedLine(ctx, line, width / 2, currentY + 12, true, "13px 'Segoe UI', Arial, sans-serif", "center");
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
		const redisKey = `anarchy:cache:coords:${host.toLowerCase()}`;
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
			const redisKey = `anarchy:cache:avatar:${lowerUser}`;
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

	/**
	 * Render Minecraft in-game world environment background based on bot surroundings & dimension
	 */
	private static drawWorldBackground(
		ctx: SKRSContext2D,
		width: number,
		height: number,
		botInstance: Minecraft
	): void {
		const bot = botInstance.bot;
		const dimension = String(bot?.game?.dimension || "minecraft:overworld").toLowerCase();
		const isNether = dimension.includes("nether");
		const isEnd = dimension.includes("end");

		// 1. Base Sky Gradient depending on dimension
		const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
		if (isNether) {
			skyGradient.addColorStop(0, "#2c0909");
			skyGradient.addColorStop(0.5, "#4a1010");
			skyGradient.addColorStop(1, "#190505");
		} else if (isEnd) {
			skyGradient.addColorStop(0, "#0b0c13");
			skyGradient.addColorStop(0.6, "#141624");
			skyGradient.addColorStop(1, "#07080c");
		} else {
			// Overworld dusk / realistic sky
			skyGradient.addColorStop(0, "#1a2a3a");
			skyGradient.addColorStop(0.5, "#2d4b68");
			skyGradient.addColorStop(1, "#182635");
		}
		ctx.fillStyle = skyGradient;
		ctx.fillRect(0, 0, width, height);

		// 2. Terrain & Horizon silhouettes based on surrounding blocks / dimension
		const horizonY = Math.floor(height * 0.65);

		// Distant mountains / terrain
		ctx.beginPath();
		ctx.moveTo(0, horizonY);
		for (let x = 0; x <= width; x += 40) {
			const elevation = Math.sin((x / width) * Math.PI * 3) * 25 + Math.cos(x / 60) * 15;
			ctx.lineTo(x, horizonY - 30 + elevation);
		}
		ctx.lineTo(width, height);
		ctx.lineTo(0, height);
		ctx.closePath();

		if (isNether) {
			ctx.fillStyle = "#3d0e0e";
			ctx.fill();
			// Lava lake glow
			const lavaGradient = ctx.createLinearGradient(0, horizonY, 0, height);
			lavaGradient.addColorStop(0, "rgba(220, 70, 10, 0.4)");
			lavaGradient.addColorStop(1, "rgba(100, 20, 5, 0.8)");
			ctx.fillStyle = lavaGradient;
			ctx.fillRect(0, horizonY + 20, width, height - (horizonY + 20));
		} else if (isEnd) {
			ctx.fillStyle = "#1b1d2e";
			ctx.fill();
			// Floating End island textures
			ctx.fillStyle = "#272a40";
			ctx.beginPath();
			ctx.ellipse(width * 0.25, horizonY + 30, 90, 35, 0, 0, Math.PI * 2);
			ctx.ellipse(width * 0.75, horizonY + 50, 120, 45, 0, 0, Math.PI * 2);
			ctx.fill();
		} else {
			// Overworld terrain: check bot feet block if available
			let groundColor = "#1e3320"; // Forest / Grass green
			try {
				const pos = bot?.entity?.position;
				if (pos && bot?.blockAt) {
					const blockBelow = bot.blockAt(pos.offset(0, -1, 0));
					const blockName = blockBelow?.name?.toLowerCase() || "";
					if (blockName.includes("sand")) groundColor = "#524424";
					else if (blockName.includes("stone") || blockName.includes("deepslate")) groundColor = "#262b30";
					else if (blockName.includes("nether")) groundColor = "#3d0e0e";
					else if (blockName.includes("snow") || blockName.includes("ice")) groundColor = "#3b4d5e";
				}
			} catch {
				groundColor = "#1e3320";
			}

			ctx.fillStyle = groundColor;
			ctx.fill();
		}

		// 3. Darkened Vignette & Blur Tint Overlay (Makes Tablist stand out clearly)
		const vignette = ctx.createRadialGradient(
			width / 2, height / 2, width * 0.2,
			width / 2, height / 2, width * 0.75
		);
		vignette.addColorStop(0, "rgba(0, 0, 0, 0.45)");
		vignette.addColorStop(1, "rgba(0, 0, 0, 0.80)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, width, height);
	}

	/**
	 * Draw text with Minecraft format color segments & Minecraft drop shadow (+2px)
	 */
	private static drawMinecraftFormattedLine(
		ctx: SKRSContext2D,
		rawText: string,
		x: number,
		y: number,
		isCenter: boolean = false,
		font: string = "14px 'Segoe UI', Arial, sans-serif",
		align: "left" | "center" | "right" = "left",
		maxWidth?: number
	): void {
		if (!rawText) return;

		const segments = ChatParser.parseMinecraftFormattedSegments(rawText);
		if (segments.length === 0) return;

		ctx.font = font;

		// Calculate total width of all segments
		let totalWidth = 0;
		for (const seg of segments) {
			totalWidth += ctx.measureText(seg.text).width;
		}

		// If maxWidth is specified and totalWidth exceeds maxWidth, scale or trim
		let renderSegments = segments;
		if (maxWidth && totalWidth > maxWidth) {
			let currentWidth = 0;
			renderSegments = [];
			for (const seg of segments) {
				const segW = ctx.measureText(seg.text).width;
				if (currentWidth + segW <= maxWidth - 12) {
					renderSegments.push(seg);
					currentWidth += segW;
				} else {
					const remainingW = maxWidth - 12 - currentWidth;
					if (remainingW > 10) {
						const trimmed = this.truncateText(seg.text, Math.max(3, Math.floor(seg.text.length * (remainingW / segW))));
						renderSegments.push({ ...seg, text: trimmed });
					}
					renderSegments.push({
						text: "…",
						color: "#aaaaaa",
						shadow: "#2a2a2a",
						bold: false,
						italic: false,
					});
					break;
				}
			}
			totalWidth = 0;
			for (const seg of renderSegments) {
				totalWidth += ctx.measureText(seg.text).width;
			}
		}

		let startX = x;
		if (align === "center" || isCenter) {
			startX = x - totalWidth / 2;
		} else if (align === "right") {
			startX = x - totalWidth;
		}

		ctx.textAlign = "left";

		// Pass 1: Draw Drop Shadow (+2px X, +2px Y)
		let curX = startX;
		for (const seg of renderSegments) {
			ctx.fillStyle = seg.shadow;
			ctx.fillText(seg.text, curX + 2, y + 2);
			curX += ctx.measureText(seg.text).width;
		}

		// Pass 2: Draw Foreground Text
		curX = startX;
		for (const seg of renderSegments) {
			ctx.fillStyle = seg.color;
			ctx.fillText(seg.text, curX, y);
			curX += ctx.measureText(seg.text).width;
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
