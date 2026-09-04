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
	// VANILLA MINECRAFT ENGLISH PATTERNS ONLY
	// ==========================================

	// --- 1. Specific Entities & Magic (Death) ---
	{
		name: "en_magic",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by magic$",
		cause: DeathCause.DEATH,
		priority: 105,
	},
	{
		name: "en_mob_blown_up",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was blown up by\\s+(?<mob>Creeper|Wither|Ghast|Ender Dragon|Mob)$",
		cause: DeathCause.DEATH,
		priority: 105,
	},
	{
		name: "en_mob_slain",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was slain by\\s+(?<mob>Zombie|Skeleton|Spider|Cave Spider|Enderman|Zombie Pigman|Zombified Piglin|Piglin|Piglin Brute|Hoglin|Zoglin|Blaze|Ghast|Magma Cube|Slime|Witch|Wither Skeleton|Wither|Ender Dragon|Guardian|Elder Guardian|Shulker|Silverfish|Endermite|Phantom|Drowned|Husk|Stray|Pillager|Ravager|Vindicator|Evoker|Vex|Warden|Iron Golem|Snow Golem|Wolf|Polar Bear|Bee|Breeze|Bogged)(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.DEATH,
		priority: 105,
	},

	// --- 2. PvP (Player vs Player) ---
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

	// --- 3. General Mob (Death) ---
	{
		name: "en_mob_killed",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+was killed by\\s+(?<mob>.+?)(?:\\s+using\\s+\\[?(?<weapon>.+?)\\]?)?$",
		cause: DeathCause.DEATH,
		priority: 95,
	},

	// --- 4. Environment & Vanilla Causes (Death) ---
	{
		name: "en_fall_ground",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+hit the ground too hard$",
		cause: DeathCause.DEATH,
		priority: 90,
	},
	{
		name: "en_fall_high",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell from a high place$",
		cause: DeathCause.DEATH,
		priority: 90,
	},
	{
		name: "en_void",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell into the void$",
		cause: DeathCause.DEATH,
		priority: 90,
	},
	{
		name: "en_out_world",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+fell out of the world$",
		cause: DeathCause.DEATH,
		priority: 90,
	},
	{
		name: "en_drown",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+drowned$",
		cause: DeathCause.DEATH,
		priority: 80,
	},
	{
		name: "en_lava",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+tried to swim in lava$",
		cause: DeathCause.DEATH,
		priority: 80,
	},
	{
		name: "en_fire",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+(?:burned to death|went up in flames)$",
		cause: DeathCause.DEATH,
		priority: 80,
	},
	{
		name: "en_explosion",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+blew up$",
		cause: DeathCause.DEATH,
		priority: 70,
	},
	{
		name: "en_wither",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+withered away$",
		cause: DeathCause.DEATH,
		priority: 70,
	},
	{
		name: "en_suffocate",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+suffocated in a wall$",
		cause: DeathCause.DEATH,
		priority: 60,
	},
	{
		name: "en_starve",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+starved to death$",
		cause: DeathCause.DEATH,
		priority: 60,
	},
	{
		name: "en_died",
		serverScope: "global",
		pattern: "^(?<victim>[a-zA-Z0-9_]{3,16})\\s+died$",
		cause: DeathCause.DEATH,
		priority: 50,
	},
];
