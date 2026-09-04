/**
 * Utility for detecting and redacting sensitive Minecraft coordinates
 * (Protecting player bases, stashes, and portals from being leaked to Discord LiveChat)
 * Supports full coordinates, shorthand notations (40k, 30k, -150k), and hybrid forms.
 */
export class CoordinateFilter {
	// Pattern 1: Explicit labeled coordinates (e.g. X: 150000, Y: 64, Z: -300000 or X: 40k, Z: -30k or x=150k z=-300k)
	private static readonly LABELED_COORD_REGEX =
		/(?:x\s*[:=]\s*-?\d+(?:\.\d+)?k?(?:[,\s]+y\s*[:=]\s*-?\d{1,3})?[,\s]+z\s*[:=]\s*-?\d+(?:\.\d+)?k?|z\s*[:=]\s*-?\d+(?:\.\d+)?k?(?:[,\s]+y\s*[:=]\s*-?\d{1,3})?[,\s]+x\s*[:=]\s*-?\d+(?:\.\d+)?k?)/gi;

	// Pattern 2: 3-number/shorthand coordinates (e.g. 150000 64 -300000, 40k 64 -30k, 40k ~ -100k)
	private static readonly TRIPLE_COORD_REGEX =
		/(?<!\w)(?:-?(?:\d{3,8}|\d+(?:\.\d+)?k)\s+(?:~|-?\d{1,3}|-?\d+(?:\.\d+)?k)\s+-?(?:\d{3,8}|\d+(?:\.\d+)?k))(?!\w)/gi;

	// Pattern 3: 2-number/shorthand coordinates separated by slash, comma, or space (e.g. 40k/30k, 40k, -30k, 40k 30k, 150000 -300000)
	private static readonly DOUBLE_COORD_REGEX =
		/(?<!\w)(?:-?(?:\d{4,8}|\d+(?:\.\d+)?k)\s*[/,]\s*-?(?:\d{4,8}|\d+(?:\.\d+)?k)|-?(?:\d{4,8}|\d+(?:\.\d+)?k)\s+-?(?:\d{4,8}|\d+(?:\.\d+)?k))(?!\w)/gi;

	// Pattern 4: Hybrid number + shorthand (e.g. 40k -30000, 150000 / -30k, -150000 ~ 40k)
	private static readonly HYBRID_COORD_REGEX =
		/(?<!\w)(?:-?\d+(?:\.\d+)?k\s*[/,\s~]+\s*-?\d{4,8}|-?\d{4,8}\s*[/,\s~]+\s*-?\d+(?:\.\d+)?k)(?!\w)/gi;

	/**
	 * Checks if the given text contains probable coordinates
	 */
	public static hasCoordinates(text: string): boolean {
		if (!text) return false;
		return (
			this.LABELED_COORD_REGEX.test(text) ||
			this.TRIPLE_COORD_REGEX.test(text) ||
			this.DOUBLE_COORD_REGEX.test(text) ||
			this.HYBRID_COORD_REGEX.test(text)
		);
	}

	/**
	 * Redacts coordinates in text with a safe stealth placeholder
	 */
	public static redactCoordinates(text: string, placeholder = "[TỌA ĐỘ ĐÃ ĐƯỢC ẨN]"): string {
		if (!text) return text;

		let result = text;
		// Reset regex state before replacement
		result = result.replace(this.LABELED_COORD_REGEX, placeholder);
		result = result.replace(this.TRIPLE_COORD_REGEX, placeholder);
		result = result.replace(this.DOUBLE_COORD_REGEX, placeholder);
		result = result.replace(this.HYBRID_COORD_REGEX, placeholder);

		return result;
	}
}
