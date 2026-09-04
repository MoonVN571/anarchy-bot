export function formatDuration(totalSeconds: number): string {
	if (!totalSeconds || totalSeconds < 0) return "0s";

	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = Math.floor(totalSeconds % 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

	return parts.join(" ");
}

export function formatTimeAgo(timestamp: Date | number): string {
	const time = typeof timestamp === "number" ? timestamp : timestamp.getTime();
	return `<t:${Math.floor(time / 1000)}:R>`;
}

export function formatRelativeTime(timestamp: Date | number): string {
	if (!timestamp) return "N/A";
	const time = typeof timestamp === "number" ? timestamp : timestamp.getTime();
	if (isNaN(time)) return "N/A";

	const now = Date.now();
	const diffSeconds = Math.max(0, Math.floor((now - time) / 1000));

	if (diffSeconds < 10) return "vừa xong";
	if (diffSeconds < 60) return `${diffSeconds} giây trước`;

	const diffMinutes = Math.floor(diffSeconds / 60);
	if (diffMinutes < 60) return `${diffMinutes} phút trước`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} giờ trước`;

	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 30) return `${diffDays} ngày trước`;

	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) return `${diffMonths} tháng trước`;

	const diffYears = Math.floor(diffDays / 365);
	return `${Math.max(1, diffYears)} năm trước`;
}

