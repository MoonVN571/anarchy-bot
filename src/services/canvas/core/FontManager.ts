import { GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import fs from "fs";

export class FontManager {
	private static isLoaded = false;
	public static readonly FONT_FAMILY = "MinecraftF2D";

	/**
	 * Register Minecraft pixel font minecraft-f2d-v1-42.otf into GlobalFonts
	 */
	public static init(): void {
		if (this.isLoaded) return;

		const candidatePaths = [
			path.resolve(__dirname, "../../../assets/fonts/minecraft-f2d-v1-42.otf"),
			path.resolve(__dirname, "../../assets/fonts/minecraft-f2d-v1-42.otf"),
			path.resolve(process.cwd(), "src/assets/fonts/minecraft-f2d-v1-42.otf"),
			path.resolve(process.cwd(), "dist/assets/fonts/minecraft-f2d-v1-42.otf"),
		];

		for (const fontPath of candidatePaths) {
			if (fs.existsSync(fontPath)) {
				try {
					GlobalFonts.registerFromPath(fontPath, this.FONT_FAMILY);
					this.isLoaded = true;
					return;
				} catch {
					// Continue to next path
				}
			}
		}
	}

	/**
	 * Get font string with standard fallback
	 */
	public static getFont(sizePx: number, bold: boolean = false): string {
		this.init();
		const weight = bold ? "bold " : "";
		return `${weight}${sizePx}px '${this.FONT_FAMILY}', 'Segoe UI', Arial, sans-serif`;
	}
}

// Auto-initialize on module load
FontManager.init();
