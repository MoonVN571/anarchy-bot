/**
 * Utility functions for Vietnamese text processing, diacritics removal, and command normalization
 */

/**
 * Remove Vietnamese accents/diacritics and convert to lower-case ASCII
 * e.g. "Trợ Giúp" -> "tro giup", "Dừng Lại" -> "dung lai", "Đến Tọa Độ" -> "den toa do"
 */
export function removeVietnameseDiacritics(str: string): string {
	if (!str) return "";
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, (d) => (d === "đ" ? "d" : "D"))
		.trim();
}

/**
 * Normalize command string for lookup: removes leading prefix, trims, normalizes diacritics
 */
export function normalizeCommandName(input: string): string {
	if (!input) return "";
	return input
		.toLowerCase()
		.trim()
		.replace(/^[>!/]+/, "");
}

/**
 * Check if a user input mode matches ON (bật, on, enable, 1, yes, mo, mở)
 */
export function isToggleOn(input: string): boolean {
	if (!input) return false;
	const clean = removeVietnameseDiacritics(input.toLowerCase().trim());
	return ["on", "bat", "enable", "1", "yes", "true", "mo", "kichhoat"].includes(clean);
}

/**
 * Check if a user input mode matches OFF (tắt, off, disable, 0, no, dong, đóng)
 */
export function isToggleOff(input: string): boolean {
	if (!input) return false;
	const clean = removeVietnameseDiacritics(input.toLowerCase().trim());
	return ["off", "tat", "disable", "0", "no", "false", "dong", "huy"].includes(clean);
}
