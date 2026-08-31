import { SKRSContext2D } from "@napi-rs/canvas";
import { ChatParser } from "../../../utils/chatParser";
import { FontManager } from "./FontManager";

export class CanvasHelpers {
	/**
	 * Draw a rounded rectangle path
	 */
	public static roundRect(
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

	/**
	 * Draw text with Minecraft color formatting (§a, §c, etc.) and drop shadow (+2px)
	 */
	public static drawMinecraftFormattedLine(
		ctx: SKRSContext2D,
		rawText: string,
		x: number,
		y: number,
		isCenter: boolean = false,
		fontSize: number = 14,
		bold: boolean = false,
		align: "left" | "center" | "right" = "left",
		maxWidth?: number
	): void {
		if (!rawText) return;

		const segments = ChatParser.parseMinecraftFormattedSegments(rawText);
		if (segments.length === 0) return;

		ctx.font = FontManager.getFont(fontSize, bold);

		// Calculate total width
		let totalWidth = 0;
		for (const seg of segments) {
			totalWidth += ctx.measureText(seg.text).width;
		}

		let renderSegments = segments;
		if (maxWidth && totalWidth > maxWidth) {
			let currentWidth = 0;
			renderSegments = [];
			for (const seg of segments) {
				const segW = ctx.measureText(seg.text).width;
				if (currentWidth + segW <= maxWidth - 10) {
					renderSegments.push(seg);
					currentWidth += segW;
				} else {
					const remainingW = maxWidth - 10 - currentWidth;
					if (remainingW > 8) {
						const trimmed = this.truncateText(
							seg.text,
							Math.max(2, Math.floor(seg.text.length * (remainingW / segW)))
						);
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
			ctx.fillStyle = seg.shadow || "#1b1b1b";
			ctx.fillText(seg.text, curX + 2, y + 2);
			curX += ctx.measureText(seg.text).width;
		}

		// Pass 2: Draw Foreground Text
		curX = startX;
		for (const seg of renderSegments) {
			ctx.fillStyle = seg.color || "#ffffff";
			ctx.fillText(seg.text, curX, y);
			curX += ctx.measureText(seg.text).width;
		}
	}

	public static getYawFacing(yawDeg: number): { label: string; axis: string; compass: string } {
		const norm = ((yawDeg % 360) + 360) % 360;
		if (norm >= 45 && norm < 135) return { label: "West (-X)", axis: "-X", compass: "W" };
		if (norm >= 135 && norm < 225) return { label: "North (-Z)", axis: "-Z", compass: "N" };
		if (norm >= 225 && norm < 315) return { label: "East (+X)", axis: "+X", compass: "E" };
		return { label: "South (+Z)", axis: "+Z", compass: "S" };
	}

	public static truncateText(str: string, maxLen: number): string {
		return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
	}
}
