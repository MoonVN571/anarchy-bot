export interface DefaultSystemPattern {
	name: string;
	pattern: string;
	serverScope: string;
	category: "announcement" | "restart" | "queue" | "tip" | "reward" | "navigation" | "general";
	priority: number;
}

export const defaultSystemPatterns: DefaultSystemPattern[] = [
	// 1. 2Y2C / AnarchyVN Navigation & Joining
	{
		name: "vn_cmd_join_server",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?dùng\\s+lệnh\\s*\\/\\w+\\s+để\\s+vào\\s+server.*$",
		serverScope: "global",
		category: "navigation",
		priority: 100,
	},
	{
		name: "vn_entering_server",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?đang\\s+vào\\s+[a-zA-Z0-9_.-]+.*$",
		serverScope: "global",
		category: "navigation",
		priority: 100,
	},
	{
		name: "vn_slot_info",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?Slot:\\s*\\d+.*$",
		serverScope: "global",
		category: "navigation",
		priority: 95,
	},
	{
		name: "vn_discord_link",
		pattern: "^(?:\\[[^\\]]+\\]\\s*|<[^>]+>\\s*>\\s*)?Tham\\s+gia\\s+discord\\s+.*$",
		serverScope: "global",
		category: "announcement",
		priority: 90,
	},
	{
		name: "vn_restart_countdown",
		pattern: "^(?:\\[[^\\]]+\\]\\s*|<[^>]+>\\s*)?(?:Máy\\s+chủ|Server)\\s+(?:sẽ\\s+)?(?:khởi\\s+động\\s+lại|restart|bảo\\s+trì)\\s+sau\\s+.*$",
		serverScope: "global",
		category: "restart",
		priority: 90,
	},
	{
		name: "vn_queue_position",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?(?:Vị\\s+trí\\s+hàng\\s+đợi|Hàng\\s+đợi|Queue\\s+position):?\\s*\\d+.*$",
		serverScope: "global",
		category: "queue",
		priority: 90,
	},
	{
		name: "vn_auth_prompt",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?(?:Vui\\s+lòng\\s+)?(?:đăng\\s+nhập|đăng\\s+ký|sử\\s+dụng)\\s+bằng\\s+lệnh\\s+\\/(?:login|register|reg|pin).*$",
		serverScope: "global",
		category: "navigation",
		priority: 85,
	},
	{
		name: "vn_premium_login",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?.*(?:nhập\\s+vì\\s+sử\\s+dụng\\s+tài\\s+khoản\\s+\\[premium\\]|tài\\s+khoản\\s+bản\\s+quyền).*$",
		serverScope: "global",
		category: "navigation",
		priority: 85,
	},
	{
		name: "vn_anti_afk",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?.*(?:AFK|tự\\s+động\\s+ngắt\\s+kết\\s+nối|kicked\\s+for\\s+being\\s+afk).*$",
		serverScope: "global",
		category: "general",
		priority: 80,
	},
	{
		name: "vn_vote_reward",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?.*(?:đã\\s+vote\\s+cho\\s+server|nhận\\s+thưởng\\s+vote|vote\\s+tại).*$",
		serverScope: "global",
		category: "reward",
		priority: 80,
	},

	// 2. English / Vanilla System Messages
	{
		name: "en_server_restart",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?(?:Server\\s+restarting\\s+in|Restarting\\s+in|Server\\s+will\\s+restart\\s+in)\\s+.*$",
		serverScope: "global",
		category: "restart",
		priority: 90,
	},
	{
		name: "en_queue_position",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?(?:Position\\s+in\\s+queue|Queue\\s+position):?\\s*\\d+.*$",
		serverScope: "global",
		category: "queue",
		priority: 90,
	},
	{
		name: "en_whitelist_prompt",
		pattern: "^(?:\\[[^\\]]+\\]\\s*)?(?:You\\s+are\\s+not\\s+whitelisted|Server\\s+is\\s+full).*$",
		serverScope: "global",
		category: "general",
		priority: 80,
	},
];
