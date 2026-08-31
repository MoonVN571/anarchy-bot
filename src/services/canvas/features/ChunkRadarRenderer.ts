import { SKRSContext2D } from "@napi-rs/canvas";
import { Minecraft } from "../../../structures";
import { CanvasHelpers } from "../core/CanvasHelpers";
import { FontManager } from "../core/FontManager";

export class ChunkRadarRenderer {
	private static readonly BLOCK_COLORS: Record<string, string> = {
		water: "#2b56b3",
		lava: "#d94e18",
		grass_block: "#527e2a",
		moss_block: "#527e2a",
		dirt: "#79553c",
		coarse_dirt: "#63442f",
		podzol: "#533f2b",
		sand: "#d4cc92",
		sandstone: "#cfc684",
		stone: "#5c6370",
		cobblestone: "#505662",
		gravel: "#60646c",
		andesite: "#61676b",
		diorite: "#a1a1a6",
		granite: "#7d5d52",
		deepslate: "#2b2e35",
		bedrock: "#181a1d",
		obsidian: "#14111d",
		crying_obsidian: "#26153b",
		netherrack: "#5e1616",
		crimson_nylium: "#6d1822",
		warped_nylium: "#1e5b56",
		end_stone: "#d4d896",
		purpur_block: "#885788",
		snow: "#e2e8f0",
		snow_block: "#e2e8f0",
		ice: "#93c5fd",
		packed_ice: "#60a5fa",
		blue_ice: "#3b82f6",
		oak_leaves: "#386127",
		spruce_leaves: "#2d4d29",
		birch_leaves: "#4d6b38",
		jungle_leaves: "#3c6623",
		acacia_leaves: "#4c6e26",
		dark_oak_leaves: "#2a4c1c",
		mangrove_leaves: "#3e6922",
		cherry_leaves: "#db859c",
		oak_planks: "#9a784f",
		spruce_planks: "#684e32",
		birch_planks: "#b8a876",
		jungle_planks: "#946849",
		acacia_planks: "#995431",
		dark_oak_planks: "#422a18",
	};

	/**
	 * Draw a high-detail 3x3 Chunk (48x48 blocks) Radar Minimap onto the Canvas
	 */
	public static drawChunkRadar(
		ctx: SKRSContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		botInstance: Minecraft
	): void {
		const bot = botInstance.bot;
		const pos = bot?.entity?.position;

		const bx = pos ? pos.x : 0;
		const by = pos ? pos.y : 64;
		const bz = pos ? pos.z : 0;

		const currentChunkX = Math.floor(bx / 16);
		const currentChunkZ = Math.floor(bz / 16);
		const inChunkX = ((Math.floor(bx) % 16) + 16) % 16;
		const inChunkZ = ((Math.floor(bz) % 16) + 16) % 16;

		// 1. Radar Container Background
		ctx.fillStyle = "rgba(10, 15, 29, 0.85)";
		CanvasHelpers.roundRect(ctx, x, y, width, height, 10);
		ctx.fill();

		ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
		ctx.lineWidth = 1.5;
		CanvasHelpers.roundRect(ctx, x, y, width, height, 10);
		ctx.stroke();

		// Header Label
		ctx.fillStyle = "#38bdf8";
		ctx.font = FontManager.getFont(12, true);
		ctx.fillText("CHUNK RADAR (3x3)", x + 12, y + 20);

		ctx.fillStyle = "#94a3b8";
		ctx.font = FontManager.getFont(11, false);
		ctx.textAlign = "right";
		ctx.fillText(`Chunk: [${currentChunkX}, ${currentChunkZ}]`, x + width - 12, y + 20);
		ctx.textAlign = "left";

		// Radar Map Viewport (Center 3x3 chunks: 48 blocks total)
		const mapSize = Math.min(width - 24, height - 58);
		const mapX = x + Math.floor((width - mapSize) / 2);
		const mapY = y + 28;

		const blocksRadius = 24; // 48 blocks across (-24 to +23)
		const blockSize = mapSize / (blocksRadius * 2);

		ctx.save();
		CanvasHelpers.roundRect(ctx, mapX, mapY, mapSize, mapSize, 6);
		ctx.clip();

		// Fill base terrain
		ctx.fillStyle = "#1e293b";
		ctx.fillRect(mapX, mapY, mapSize, mapSize);

		// 2. Sample Blocks from bot.world / bot.blockAt
		const startBlockX = Math.floor(bx) - blocksRadius;
		const startBlockZ = Math.floor(bz) - blocksRadius;

		for (let rx = 0; rx < blocksRadius * 2; rx++) {
			for (let rz = 0; rz < blocksRadius * 2; rz++) {
				const worldX = startBlockX + rx;
				const worldZ = startBlockZ + rz;

				let color = "#334155";

				if (bot && (bot as any).blockAt) {
					try {
						// Check block at bot height, slightly below, and above
						let block = (bot as any).blockAt({ x: worldX, y: Math.floor(by), z: worldZ });
						if (!block || block.name === "air") {
							block = (bot as any).blockAt({ x: worldX, y: Math.floor(by) - 1, z: worldZ });
						}
						if (!block || block.name === "air") {
							block = (bot as any).blockAt({ x: worldX, y: Math.floor(by) - 2, z: worldZ });
						}

						if (block && block.name && block.name !== "air") {
							const name = block.name.toLowerCase();
							color = this.matchBlockColor(name);
						}
					} catch {
						color = "#334155";
					}
				}

				ctx.fillStyle = color;
				ctx.fillRect(
					mapX + rx * blockSize,
					mapY + rz * blockSize,
					blockSize + 0.5,
					blockSize + 0.5
				);
			}
		}

		// 3. Draw Chunk Grid Lines (Every 16 blocks)
		ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
		ctx.lineWidth = 1;

		for (let wx = startBlockX; wx <= startBlockX + blocksRadius * 2; wx++) {
			if (wx % 16 === 0) {
				const px = mapX + (wx - startBlockX) * blockSize;
				ctx.beginPath();
				ctx.moveTo(px, mapY);
				ctx.lineTo(px, mapY + mapSize);
				ctx.stroke();
			}
		}

		for (let wz = startBlockZ; wz <= startBlockZ + blocksRadius * 2; wz++) {
			if (wz % 16 === 0) {
				const pz = mapY + (wz - startBlockZ) * blockSize;
				ctx.beginPath();
				ctx.moveTo(mapX, pz);
				ctx.lineTo(mapX + mapSize, pz);
				ctx.stroke();
			}
		}

		// Highlight current chunk (16x16)
		const currentChunkStartWorldX = currentChunkX * 16;
		const currentChunkStartWorldZ = currentChunkZ * 16;
		const chunkScreenX = mapX + (currentChunkStartWorldX - startBlockX) * blockSize;
		const chunkScreenZ = mapY + (currentChunkStartWorldZ - startBlockZ) * blockSize;
		const chunkScreenW = 16 * blockSize;

		ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
		ctx.fillRect(chunkScreenX, chunkScreenZ, chunkScreenW, chunkScreenW);
		ctx.strokeStyle = "#38bdf8";
		ctx.lineWidth = 1.5;
		ctx.strokeRect(chunkScreenX, chunkScreenZ, chunkScreenW, chunkScreenW);

		// 4. Draw Nearby Entities / Players
		if (bot?.entities) {
			for (const entity of Object.values(bot.entities)) {
				if (!entity || entity === bot.entity || !entity.position) continue;

				const ex = entity.position.x;
				const ez = entity.position.z;

				const relX = ex - startBlockX;
				const relZ = ez - startBlockZ;

				if (relX >= 0 && relX < blocksRadius * 2 && relZ >= 0 && relZ < blocksRadius * 2) {
					const entityScreenX = mapX + relX * blockSize;
					const entityScreenZ = mapY + relZ * blockSize;

					const isPlayer = entity.type === "player";
					ctx.fillStyle = isPlayer ? "#facc15" : "#ef4444";
					ctx.beginPath();
					ctx.arc(entityScreenX, entityScreenZ, isPlayer ? 3.5 : 2.5, 0, Math.PI * 2);
					ctx.fill();
				}
			}
		}

		// 5. Draw Bot Center Marker & Heading Arrow (Yaw)
		const botScreenX = mapX + blocksRadius * blockSize;
		const botScreenZ = mapY + blocksRadius * blockSize;

		const yaw = bot?.entity?.yaw ?? 0;

		// Radar pulse circle
		ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
		ctx.beginPath();
		ctx.arc(botScreenX, botScreenZ, 7, 0, Math.PI * 2);
		ctx.fill();

		// Center Dot
		ctx.fillStyle = "#ef4444";
		ctx.beginPath();
		ctx.arc(botScreenX, botScreenZ, 4, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// Heading Arrow pointer
		const arrowLen = 14;
		const angle = -yaw + Math.PI;
		const arrowTipX = botScreenX + Math.sin(angle) * arrowLen;
		const arrowTipY = botScreenZ - Math.cos(angle) * arrowLen;

		ctx.strokeStyle = "#ffffff";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(botScreenX, botScreenZ);
		ctx.lineTo(arrowTipX, arrowTipY);
		ctx.stroke();

		ctx.restore();

		// Footer info: in-chunk coordinates
		ctx.fillStyle = "#64748b";
		ctx.font = FontManager.getFont(10, false);
		ctx.fillText(`In-Chunk: [${inChunkX}, ${Math.floor(by)}, ${inChunkZ}]`, x + 12, y + height - 8);

		const facing = CanvasHelpers.getYawFacing(yaw * (180 / Math.PI));
		ctx.textAlign = "right";
		ctx.fillText(`Facing: ${facing.compass} (${facing.axis})`, x + width - 12, y + height - 8);
		ctx.textAlign = "left";
	}

	private static matchBlockColor(blockName: string): string {
		for (const [key, color] of Object.entries(this.BLOCK_COLORS)) {
			if (blockName.includes(key)) {
				return color;
			}
		}
		if (blockName.includes("water")) return "#2b56b3";
		if (blockName.includes("lava")) return "#d94e18";
		if (blockName.includes("grass") || blockName.includes("moss")) return "#527e2a";
		if (blockName.includes("wood") || blockName.includes("log")) return "#785334";
		if (blockName.includes("stone") || blockName.includes("slate") || blockName.includes("ore")) return "#5c6370";
		if (blockName.includes("sand")) return "#d4cc92";
		if (blockName.includes("nether")) return "#5e1616";
		return "#475569";
	}
}
