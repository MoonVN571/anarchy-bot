import { createCanvas, SKRSContext2D } from "@napi-rs/canvas";
import { Minecraft } from "../../../structures";
import { Server } from "../../../typings";
import { RedisManager } from "../../../redis/RedisManager";
import { FontManager } from "../core/FontManager";
import { CanvasHelpers } from "../core/CanvasHelpers";
import { AvatarCache } from "../core/AvatarCache";
import { ChunkRadarRenderer } from "./ChunkRadarRenderer";

interface CacheEntry<T> {
	data: T;
	expiry: number;
}

export class CoordinatesRenderer {
	private static coordsImageCache = new Map<string, CacheEntry<{ buffer: Buffer; x: number; y: number; z: number }>>();
	private static readonly COORDS_TTL_MS = 2 * 1000; // 2 seconds

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

		const width = 720;
		const height = 370;
		const canvas = createCanvas(width, height);
		const ctx: SKRSContext2D = canvas.getContext("2d");

		// Background Gradient
		const bg = ctx.createLinearGradient(0, 0, width, height);
		bg.addColorStop(0, "#0b1329");
		bg.addColorStop(1, "#020617");
		ctx.fillStyle = bg;
		CanvasHelpers.roundRect(ctx, 0, 0, width, height, 14);
		ctx.fill();

		// Border
		ctx.strokeStyle = "rgba(14, 165, 233, 0.35)";
		ctx.lineWidth = 2;
		CanvasHelpers.roundRect(ctx, 1, 1, width - 2, height - 2, 14);
		ctx.stroke();

		// Header
		ctx.fillStyle = "#ffffff";
		ctx.font = FontManager.getFont(17, true);
		ctx.fillText(`[POS] BOT COORDINATES & RADAR - ${botInstance.config.name || host}`, 20, 32);

		// Status Badge with Glowing Dot
		const isMain = botInstance.currentServer === Server.Main;
		const statusText = isMain ? "MAIN SERVER" : "IN QUEUE";
		const statusColor = isMain ? "#22c55e" : "#f59e0b";

		ctx.save();
		ctx.fillStyle = statusColor;
		ctx.shadowColor = statusColor;
		ctx.shadowBlur = 8;
		ctx.beginPath();
		ctx.arc(width - 110, 27, 4.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		ctx.fillStyle = statusColor;
		ctx.font = FontManager.getFont(12, true);
		ctx.textAlign = "right";
		ctx.fillText(statusText, width - 20, 32);
		ctx.textAlign = "left";

		// Bot Skin Head
		const avatarImg = await AvatarCache.getAvatarImage(bot?.username || "mo0nbot");
		if (avatarImg) {
			ctx.save();
			CanvasHelpers.roundRect(ctx, 20, 50, 52, 52, 10);
			ctx.clip();
			ctx.drawImage(avatarImg, 20, 50, 52, 52);
			ctx.restore();
		}

		// Bot Name & Dimension Info
		const rawDimension = String(bot?.game?.dimension || "minecraft:overworld");
		const dimName = rawDimension.includes("nether")
			? "[NETHER]"
			: rawDimension.includes("end")
				? "[THE END]"
				: "[OVERWORLD]";
		const dimColor = rawDimension.includes("nether")
			? "#ef4444"
			: rawDimension.includes("end")
				? "#c084fc"
				: "#34d399";

		ctx.fillStyle = "#f8fafc";
		ctx.font = FontManager.getFont(16, true);
		ctx.fillText(bot?.username || "mo0nbot", 84, 70);

		ctx.fillStyle = dimColor;
		ctx.font = FontManager.getFont(13, true);
		ctx.fillText(dimName, 84, 92);

		// 1. Primary Coordinates Card (Left Panel)
		const leftPanelW = 345;
		ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
		CanvasHelpers.roundRect(ctx, 20, 114, leftPanelW, 126, 10);
		ctx.fill();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
		ctx.lineWidth = 1;
		CanvasHelpers.roundRect(ctx, 20, 114, leftPanelW, 126, 10);
		ctx.stroke();

		ctx.fillStyle = "#94a3b8";
		ctx.font = FontManager.getFont(11, false);
		ctx.fillText("CURRENT POSITION (XYZ)", 32, 134);

		// XYZ Coordinates
		ctx.fillStyle = "#38bdf8";
		ctx.font = FontManager.getFont(22, true);
		ctx.fillText(`X: ${x}`, 32, 166);
		ctx.fillStyle = "#4ade80";
		ctx.fillText(`Y: ${y}`, 142, 166);
		ctx.fillStyle = "#f472b6";
		ctx.fillText(`Z: ${z}`, 240, 166);

		// Chunk info line
		const cx = Math.floor(x / 16);
		const cz = Math.floor(z / 16);
		const inX = ((Math.floor(x) % 16) + 16) % 16;
		const inZ = ((Math.floor(z) % 16) + 16) % 16;
		ctx.fillStyle = "#facc15";
		ctx.font = FontManager.getFont(11, true);
		ctx.fillText(`Chunk: [${cx}, ${cz}]  (In-Chunk: ${inX}, ${Math.floor(y)}, ${inZ})`, 32, 194);

		// Converted Coordinates (Overworld <-> Nether)
		const isNether = rawDimension.includes("nether");
		const convX = isNether ? Math.round(x * 8) : Math.round(x / 8);
		const convZ = isNether ? Math.round(z * 8) : Math.round(z / 8);
		const convLabel = isNether ? "Overworld Equiv:" : "Nether Equiv (X/8, Z/8):";

		ctx.fillStyle = "#64748b";
		ctx.font = FontManager.getFont(10, false);
		ctx.fillText(`${convLabel} X: ${convX}, Z: ${convZ}`, 32, 222);

		// 2. Health & Food Bars
		const health = Math.max(0, Math.min(20, bot?.health ?? 20));
		const food = Math.max(0, Math.min(20, bot?.food ?? 20));

		const barWidth = 160;
		// Health Bar
		ctx.fillStyle = "#94a3b8";
		ctx.font = FontManager.getFont(11, false);
		ctx.fillText(`HP: ${Math.round(health)}/20`, 20, 264);

		ctx.fillStyle = "#1e293b";
		CanvasHelpers.roundRect(ctx, 20, 272, barWidth, 12, 6);
		ctx.fill();
		ctx.fillStyle = "#ef4444";
		CanvasHelpers.roundRect(ctx, 20, 272, Math.max(8, (health / 20) * barWidth), 12, 6);
		ctx.fill();

		// Food Bar
		ctx.fillStyle = "#94a3b8";
		ctx.font = FontManager.getFont(11, false);
		ctx.fillText(`HUNGER: ${Math.round(food)}/20`, 200, 264);

		ctx.fillStyle = "#1e293b";
		CanvasHelpers.roundRect(ctx, 200, 272, barWidth, 12, 6);
		ctx.fill();
		ctx.fillStyle = "#eab308";
		CanvasHelpers.roundRect(ctx, 200, 272, Math.max(8, (food / 20) * barWidth), 12, 6);
		ctx.fill();

		// Facing & Compass Info
		const yaw = bot?.entity?.yaw ? ((bot.entity.yaw * 180) / Math.PI) : 0;
		const pitch = bot?.entity?.pitch ? ((bot.entity.pitch * 180) / Math.PI) : 0;
		const facing = CanvasHelpers.getYawFacing(yaw);

		ctx.fillStyle = "#94a3b8";
		ctx.font = FontManager.getFont(11, false);
		ctx.fillText(`FACING: ${facing.label} | Yaw: ${Math.round(yaw)}° | Pitch: ${Math.round(pitch)}°`, 20, 314);

		// Footer Uptime
		const connectedSince = botInstance.uptime
			? `Uptime: ${Math.floor((now - botInstance.uptime) / 60000)}m`
			: "Uptime: Recently";
		ctx.fillStyle = "#475569";
		ctx.font = FontManager.getFont(10, false);
		ctx.fillText(`Bot: ${connectedSince} | Host: ${host}`, 20, 346);

		// 3. Right Side: Draw 3x3 Chunk Radar Minimap
		const radarX = 385;
		const radarY = 50;
		const radarW = 315;
		const radarH = 300;
		ChunkRadarRenderer.drawChunkRadar(ctx, radarX, radarY, radarW, radarH, botInstance);

		const buffer = canvas.toBuffer("image/png");

		// Save to L1 Cache & L2 Redis Cache
		this.coordsImageCache.set(host, {
			data: { buffer, x, y, z },
			expiry: now + this.COORDS_TTL_MS,
		});
		await RedisManager.setBuffer(redisKey, buffer, 2);

		return buffer;
	}
}
