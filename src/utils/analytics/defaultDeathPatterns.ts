import { DeathCause } from "../../database/models/DeathModel";

export interface SeedDeathPattern {
	name: string;
	serverScope: string;
	pattern: string;
	cause: DeathCause;
	priority: number;
}

export const defaultDeathPatterns: SeedDeathPattern[] = [
	// ==========================================
	// 1. VIETNAMESE PATTERNS (2Y2C / AnarchyVN / MCVui / ViAnarchy)
	// ==========================================

	// --- 1.1 Mob / NPC (High priority to catch specific mobs before general player usernames) ---
	{
		name: "vn_mob_an_song",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<mob>.+?)\\s+ăn sống$",
		cause: DeathCause.MOB,
		priority: 105,
	},
	{
		name: "vn_mob_no_banh_xac",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị nổ(?:\\s+banh xác|\\s+tung)?\\s+bởi\\s+(?<mob>Creeper|Wither|Ghast|Ender Dragon|Quái vật|Phù thủy|Xác sống)$",
		cause: DeathCause.MOB,
		priority: 105,
	},
	{
		name: "vn_mob_can_chet",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<mob>.+?)\\s+cắn chết$",
		cause: DeathCause.MOB,
		priority: 105,
	},
	{
		name: "vn_mob_giet",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<mob>Wither Skeleton|Cave Spider|Ender Dragon|Zombie Pigman|Zombified Piglin|Piglin Brute|Magma Cube|Elder Guardian|Iron Golem|Snow Golem|Polar Bear|Bọ xương Wither|Nhện hang|Rồng Ender|Người lợn thây ma|Khối dung nham|Kẻ gác đền già|Người sắt|Người tuyết|Gấu bắc cực|Ma địa ngục|Kẻ tàn phá|Kẻ triệu hồi|Kẻ chết đuối|Xác sống|Quái vật|Zombie|Skeleton|Spider|Creeper|Enderman|Wither|Witch|Slime|Ghast|Blaze|Drowned|Phantom|Husk|Stray|Pillager|Ravager|Vindicator|Evoker|Vex|Warden|Guardian|Shulker|Wolf|Bee|Breeze|Bogged)\\s+(?:giết|hạ gục)(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.MOB,
		priority: 105,
	},

	// --- 1.2 PvP (Player vs Player) ---
	{
		name: "vn_pvp_giet",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+giết(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_tien_len_bang",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+tiễn lên bảng đếm số(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_ha_guc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+hạ gục(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_danh_bai",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị đánh bại(?:\\s+dễ dàng)?\\s+bởi\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+sử dụng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_cho_an_dam",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+cho ăn đấm(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_ban_ha",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+bắn hạ(?:\\s+bằng\\s+\\[?(?<weapon>.+?)\\]?)?$",
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
		name: "vn_pvp_day_xuong_vuc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị\\s+(?<killer>[a-zA-Z0-9_]{3,16})\\s+đẩy xuống (?:vực|hư không)$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_roi_hu_khong_pk",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?rơi vào hư không\\s+khi đang chiến đấu với\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_dung_nham_pk",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?(?:bước vào|rơi vào|bơi trong)\\s+dung nham\\s+khi đang (?:trốn chạy|chiến đấu với)\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "vn_pvp_thieu_chay_pk",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+bị thiêu cháy\\s+khi đang chiến đấu với\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},

	// --- 1.3 Môi trường & Rơi ngã (Fall) ---
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
		name: "vn_fall_tren_cao",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?rơi từ trên cao xuống$",
		cause: DeathCause.FALL,
		priority: 90,
	},
	{
		name: "vn_fall_mat_dat",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?va vào mặt đất quá mạnh$",
		cause: DeathCause.FALL,
		priority: 90,
	},

	// --- 1.4 Hư không (Void) ---
	{
		name: "vn_void_hu_khong",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?rơi vào hư không$",
		cause: DeathCause.VOID,
		priority: 90,
	},
	{
		name: "vn_void_the_gioi",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?rơi khỏi thế giới$",
		cause: DeathCause.VOID,
		priority: 90,
	},

	// --- 1.5 Dung nham & Lửa (Lava / Fire) ---
	{
		name: "vn_lava_dung_nham",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?(?:thử\\s+)?bơi trong dung nham$",
		cause: DeathCause.LAVA,
		priority: 80,
	},
	{
		name: "vn_fire_thieu_chay",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?(?:bị thiêu cháy|chết cháy|cháy thành tro|bốc cháy)$",
		cause: DeathCause.FIRE,
		priority: 80,
	},

	// --- 1.6 Chết đuối (Drown) ---
	{
		name: "vn_drown_chet_duoi",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?(?:bị\\s+)?chết đuối$",
		cause: DeathCause.DROWN,
		priority: 80,
	},
	{
		name: "vn_drown_ngat_nuoc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?bị ngạt thở dưới nước$",
		cause: DeathCause.DROWN,
		priority: 80,
	},

	// --- 1.7 Cháy nổ (Explosion) ---
	{
		name: "vn_explosion_no_tung",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã nổ tung$",
		cause: DeathCause.EXPLOSION,
		priority: 70,
	},
	{
		name: "vn_explosion_pha_le",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã bị nổ tung bởi pha lê$",
		cause: DeathCause.EXPLOSION,
		priority: 70,
	},

	// --- 1.8 Tự sát, Phép thuật & Khác (Suicide / Magic / Unknown) ---
	{
		name: "vn_suicide_tu_sat",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã tự (?:sát|kết liễu đời mình)$",
		cause: DeathCause.SUICIDE,
		priority: 80,
	},
	{
		name: "vn_magic_thuoc_doc",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?(?:bị trúng độc|chết vì phép thuật)$",
		cause: DeathCause.MAGIC,
		priority: 70,
	},
	{
		name: "vn_magic_wither",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?bị héo mòn bởi Wither$",
		cause: DeathCause.MAGIC,
		priority: 70,
	},
	{
		name: "vn_suffocation_ngat_tho",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?bị ngạt thở trong tường$",
		cause: DeathCause.UNKNOWN,
		priority: 60,
	},
	{
		name: "vn_starve_chet_doi",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:đã\\s+)?chết đói$",
		cause: DeathCause.UNKNOWN,
		priority: 60,
	},
	{
		name: "vn_died_da_chet",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+đã chết$",
		cause: DeathCause.UNKNOWN,
		priority: 50,
	},

	// ==========================================
	// 2. ENGLISH / VANILLA MINECRAFT PATTERNS
	// ==========================================

	// --- 2.1 Specific Entities & Magic (Priority 105) ---
	{
		name: "en_magic",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by magic$",
		cause: DeathCause.MAGIC,
		priority: 105,
	},
	{
		name: "en_mob_blown_up",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was blown up by\\s+(?<mob>Creeper|Wither|Ghast|Ender Dragon|Mob)$",
		cause: DeathCause.MOB,
		priority: 105,
	},
	{
		name: "en_mob_slain",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was slain by\\s+(?<mob>Zombie|Skeleton|Spider|Cave Spider|Enderman|Zombie Pigman|Zombified Piglin|Piglin|Piglin Brute|Hoglin|Zoglin|Blaze|Ghast|Magma Cube|Slime|Witch|Wither Skeleton|Wither|Ender Dragon|Guardian|Elder Guardian|Shulker|Silverfish|Endermite|Phantom|Drowned|Husk|Stray|Pillager|Ravager|Vindicator|Evoker|Vex|Warden|Iron Golem|Snow Golem|Wolf|Polar Bear|Bee|Breeze|Bogged)(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.MOB,
		priority: 105,
	},

	// --- 2.2 PvP ---
	{
		name: "en_pvp_slain",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was slain by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_shot",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was shot by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_blown_up",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was blown up by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_killed",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_skewered",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was skewered by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_finished_off",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+got finished off by\\s+(?<killer>[a-zA-Z0-9_]{3,16})(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_void_pk",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:fell into the void|fell out of the world)\\s+while fighting\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_knocked_void",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was knocked into the void by\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},
	{
		name: "en_pvp_doomed_fall",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was doomed to fall by\\s+(?<killer>[a-zA-Z0-9_]{3,16})$",
		cause: DeathCause.PVP,
		priority: 100,
	},

	// --- 2.3 General Mob ---
	{
		name: "en_mob_killed",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by\\s+(?<mob>.+?)(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.MOB,
		priority: 95,
	},

	// --- 2.4 Environment & Vanilla Causes ---
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
		name: "en_out_world",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell out of the world$",
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
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:burned to death|went up in flames)$",
		cause: DeathCause.FIRE,
		priority: 80,
	},
	{
		name: "en_explosion",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+blew up$",
		cause: DeathCause.EXPLOSION,
		priority: 70,
	},
	{
		name: "en_wither",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+withered away$",
		cause: DeathCause.MAGIC,
		priority: 70,
	},
	{
		name: "en_suffocate",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+suffocated in a wall$",
		cause: DeathCause.UNKNOWN,
		priority: 60,
	},
	{
		name: "en_starve",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+starved to death$",
		cause: DeathCause.UNKNOWN,
		priority: 60,
	},
	{
		name: "en_died",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+died$",
		cause: DeathCause.UNKNOWN,
		priority: 50,
	},
];
