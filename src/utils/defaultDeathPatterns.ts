import { DeathCause } from "../database/models/DeathModel";

export interface SeedDeathPattern {
	name: string;
	serverScope: string;
	pattern: string;
	cause: DeathCause;
	priority: number;
}

export const defaultDeathPatterns: SeedDeathPattern[] = [
	// --- VIETNAMESE PATTERNS (2Y2C / AnarchyVN) ---
	{
		name: "vn_mob_an_song",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<mob>.+?)\\s+ăn sống$",
		cause: DeathCause.MOB,
		priority: 100,
	},
	{
		name: "vn_pvp_giet",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+giết(?:\\s+bằng\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_tien_len_bang",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+tiễn lên bảng đếm số(?:\\s+bằng\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_ha_guc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+hạ gục(?:\\s+bằng\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_cho_an_dam",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+cho ăn đấm(?:\\s+bằng\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_no_banh_xac",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị nổ(?:\\s+banh xác|\\s+tung)?\\s+bởi\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_fall_bay",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+nghĩ rằng họ có thể bay.*?nhưng họ không thể$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "vn_fall_du_nhay",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã quên mang dù nhảy$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "vn_fall_trong_luc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+quyết định thử nghiệm trọng lực và thất bại$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "vn_void_hu_khong",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+rơi vào hư không(?:\\s+khi đang chiến đấu với\\s+(?<killer>[a-zA-Z0-9_]{3,16}))?$",
		cause: DeathCause.VOID,
		priority: 90,
	},
	{
		name: "vn_void_the_gioi",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+rơi khỏi thế giới$",
		cause: DeathCause.VOID,
		priority: 90,
	},
	{
		name: "vn_lava_dung_nham",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bơi trong dung nham$",
		cause: DeathCause.LAVA,
		priority: 80,
	},
	{
		name: "vn_drown_chet_duoi",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị chết đuối$",
		cause: DeathCause.DROWN,
		priority: 80,
	},
	{
		name: "vn_fire_thieu_chay",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+bị thiêu cháy$",
		cause: DeathCause.FIRE,
		priority: 80,
	},
	{
		name: "vn_suicide_tu_sat",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã tự sát$",
		cause: DeathCause.SUICIDE,
		priority: 80,
	},
	{
		name: "vn_explosion_no_tung",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã nổ tung$",
		cause: DeathCause.EXPLOSION,
		priority: 70,
	},

	// --- ENGLISH VANILLA PATTERNS ---
	{
		name: "en_pvp_slain",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was slain by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_shot",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was shot by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+(?<weapon>.+))?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_blown_up",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was blown up by\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_mob_killed",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by\\s+(?<mob>.+?)(?:\\s+using\\s+(?<weapon>.+))?$",
		cause: DeathCause.MOB,
		priority: 100,
	},
	{
		name: "en_fall_ground",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+hit the ground too hard$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "en_fall_high",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell from a high place$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "en_void",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell into the void$",
		cause: DeathCause.VOID,
		priority: 90,
	},
	{
		name: "en_drown",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+drowned$",
		cause: DeathCause.DROWN,
		priority: 80,
	},
	{
		name: "en_lava",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+tried to swim in lava$",
		cause: DeathCause.LAVA,
		priority: 80,
	},
	{
		name: "en_fire",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+burned to death$",
		cause: DeathCause.FIRE,
		priority: 80,
	},
	{
		name: "en_died",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+died$",
		cause: DeathCause.UNKNOWN,
		priority: 50,
	},
];
