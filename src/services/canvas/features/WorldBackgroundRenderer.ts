import { SKRSContext2D } from "@napi-rs/canvas";
import { Minecraft } from "../../../structures";

export class WorldBackgroundRenderer {
	/**
	 * Render Minecraft in-game world environment background based on bot surroundings & dimension
	 */
	public static drawWorldBackground(
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
				if (pos && (bot as any)?.blockAt) {
					const blockBelow = (bot as any).blockAt({ x: Math.floor(pos.x), y: Math.floor(pos.y) - 1, z: Math.floor(pos.z) });
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

		// 3. Darkened Vignette & Blur Tint Overlay
		const vignette = ctx.createRadialGradient(
			width / 2, height / 2, width * 0.2,
			width / 2, height / 2, width * 0.75
		);
		vignette.addColorStop(0, "rgba(0, 0, 0, 0.45)");
		vignette.addColorStop(1, "rgba(0, 0, 0, 0.80)");
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, width, height);
	}
}
