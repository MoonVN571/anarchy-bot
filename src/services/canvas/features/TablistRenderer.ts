import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import { Minecraft } from "../../../structures";
import { RedisManager } from "../../../redis/RedisManager";
import { FontManager } from "../core/FontManager";
import { CanvasHelpers } from "../core/CanvasHelpers";
import { AvatarCache } from "../core/AvatarCache";
import { WorldBackgroundRenderer } from "./WorldBackgroundRenderer";

interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export class TablistRenderer {
	private static tablistImageCache = new Map<string, CacheEntry<Buffer>>();
	private static readonly TABLIST_TTL_MS = 4 * 1000; // 4 seconds

	/**
	 * Render visual Tablist Scoreboard card with in-game Minecraft GUI style and Multi-tier Caching
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

		// Grid layout calculation (1 to 4 columns)
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
		WorldBackgroundRenderer.drawWorldBackground(ctx, width, height, botInstance);

		// 2. Draw Translucent Minecraft Tablist Window Overlay
		const guiX = Math.floor((width - (innerWidth + 24)) / 2);
		const guiY = padding - 10;
		const guiW = innerWidth + 24;
		const guiH = height - (padding * 2) + 20;

		ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
		CanvasHelpers.roundRect(ctx, guiX, guiY, guiW, guiH, 8);
		ctx.fill();

		ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
		ctx.lineWidth = 1;
		CanvasHelpers.roundRect(ctx, guiX, guiY, guiW, guiH, 8);
		ctx.stroke();

		let currentY = padding;

		// 3. Title & Server Info
		const titleText = `§e§l${host.toUpperCase()} §7- §fTABLIST`;
		const countText = `§a${playerCount} §7players online`;
		CanvasHelpers.drawMinecraftFormattedLine(ctx, titleText, guiX + 16, currentY + 16, false, 17, true, "left");
		CanvasHelpers.drawMinecraftFormattedLine(ctx, countText, guiX + guiW - 16, currentY + 16, false, 14, true, "right");

		currentY += titleHeight;

		// 4. Header (Minecraft formatted)
		if (rawHeaderLines.length > 0) {
			for (const line of rawHeaderLines) {
				CanvasHelpers.drawMinecraftFormattedLine(ctx, line, width / 2, currentY + 12, true, 14, false, "center");
				currentY += 20;
			}
			currentY += 10;
		}

		// 5. Player Grid (In-game slot style)
		const startX = Math.floor((width - innerWidth) / 2);
		const startY = currentY;

		const playerItems = rawPlayers.slice(0, 120);
		const avatarPromises = playerItems.map(p => AvatarCache.getAvatarImage(p.username));
		const avatars = await Promise.all(avatarPromises);

		for (let i = 0; i < playerItems.length; i++) {
			const player = playerItems[i];
			const avatar = avatars[i];

			const col = i % columns;
			const row = Math.floor(i / columns);

			const itemX = startX + col * (columnWidth + gapX);
			const itemY = startY + row * (rowHeight + gapY);

			// Slot Background
			ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
			CanvasHelpers.roundRect(ctx, itemX, itemY, columnWidth, rowHeight, 4);
			ctx.fill();

			// Highlight border
			ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
			ctx.lineWidth = 1;
			CanvasHelpers.roundRect(ctx, itemX, itemY, columnWidth, rowHeight, 4);
			ctx.stroke();

			// Draw Skin Head (24x24)
			const headSize = 24;
			const headX = itemX + 4;
			const headY = itemY + 4;

			if (avatar) {
				ctx.save();
				CanvasHelpers.roundRect(ctx, headX, headY, headSize, headSize, 3);
				ctx.clip();
				ctx.drawImage(avatar, headX, headY, headSize, headSize);
				ctx.restore();
			} else {
				ctx.fillStyle = "#334155";
				CanvasHelpers.roundRect(ctx, headX, headY, headSize, headSize, 3);
				ctx.fill();
			}

			// Draw Display Name / Username with Minecraft format colors and drop-shadow
			const rawDisplayName = (player.displayName ? player.displayName.toString() : player.username) || player.username;
			const nameX = itemX + 34;
			const nameY = itemY + 20;

			// Truncate if too long to leave room for ping
			const maxNameWidth = columnWidth - 85;
			CanvasHelpers.drawMinecraftFormattedLine(
				ctx,
				rawDisplayName,
				nameX,
				nameY,
				false,
				13,
				true,
				"left",
				maxNameWidth
			);

			// Draw Ping in ms
			const ping = player.ping ?? 0;
			const pingFormatted = ping < 80
				? `§a${ping}ms`
				: ping < 180
				? `§e${ping}ms`
				: `§c${ping}ms`;

			const pingX = itemX + columnWidth - 8;
			CanvasHelpers.drawMinecraftFormattedLine(
				ctx,
				pingFormatted,
				pingX,
				nameY,
				false,
				12,
				true,
				"right"
			);
		}

		currentY = startY + playersHeight;

		// 6. Footer (Minecraft formatted)
		if (rawFooterLines.length > 0) {
			currentY += 8;
			for (const line of rawFooterLines) {
				CanvasHelpers.drawMinecraftFormattedLine(ctx, line, width / 2, currentY + 12, true, 13, false, "center");
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
}
