import { Minecraft } from "../../structures";
import { TablistRenderer } from "./features/TablistRenderer";
import { CoordinatesRenderer } from "./features/CoordinatesRenderer";
import { ChunkRadarRenderer } from "./features/ChunkRadarRenderer";
import { WorldBackgroundRenderer } from "./features/WorldBackgroundRenderer";
import { FontManager } from "./core/FontManager";
import { CanvasHelpers } from "./core/CanvasHelpers";
import { AvatarCache } from "./core/AvatarCache";

export class CanvasRendererService {
	/**
	 * Render visual Tablist Scoreboard card with in-game Minecraft GUI style, bot world background, and Multi-tier Caching
	 */
	public static async renderTablist(botInstance: Minecraft): Promise<Buffer> {
		return TablistRenderer.renderTablist(botInstance);
	}

	/**
	 * Render visual Coordinates & Status HUD card with Chunk Radar Minimap and Multi-tier Caching
	 */
	public static async renderCoordinates(botInstance: Minecraft): Promise<Buffer> {
		return CoordinatesRenderer.renderCoordinates(botInstance);
	}

	// Re-export core modules & features for advanced usage
	public static FontManager = FontManager;
	public static CanvasHelpers = CanvasHelpers;
	public static AvatarCache = AvatarCache;
	public static ChunkRadarRenderer = ChunkRadarRenderer;
	public static WorldBackgroundRenderer = WorldBackgroundRenderer;
}
