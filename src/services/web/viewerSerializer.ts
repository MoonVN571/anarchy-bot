import { Minecraft } from "../../structures";

export interface SerializedBotStats {
	health: number;
	food: number;
	saturation: number;
	totemCount: number;
	antiAfk: boolean;
	isNavigating: boolean;
	currentGoal?: unknown;
	pos: { x: number; y: number; z: number };
	mainHand: string | null;
}

export interface SerializedItem {
	name: string;
	displayName: string;
	count: number;
	slot: number;
	maxDurability: number;
	durabilityLeft: number | null;
	durabilityPct: number | null;
	enchantments: { name: string; lvl: number }[];
	customName: string | null;
}

export interface SerializedInventory {
	armor: (SerializedItem | null)[];
	offhand: SerializedItem | null;
	main: (SerializedItem | null)[];
	hotbar: (SerializedItem | null)[];
}

interface RawInventoryItem {
	name: string;
	displayName?: string;
	count: number;
	slot: number;
	maxDurability?: number;
	durabilityUsed?: number;
	enchants?: { name: string; lvl: number }[];
	customName?: string | null;
}

/**
 * Extract bot stats payload for Web 3D Viewer HUD
 */
export function getBotStats(botInstance: Minecraft): SerializedBotStats {
	const bot = botInstance.bot;
	if (!bot?.entity) {
		return {
			health: 0,
			food: 0,
			saturation: 0,
			totemCount: 0,
			antiAfk: false,
			isNavigating: false,
			pos: { x: 0, y: 0, z: 0 },
			mainHand: null,
		};
	}

	const totemCount = bot.inventory.items().filter((i) => i.name === "totem_of_undying").length;
	const mainHandItem = bot.inventory.slots[bot.getEquipmentDestSlot("hand")];

	return {
		health: Math.round(bot.health),
		food: Math.round(bot.food),
		saturation: Math.round(bot.foodSaturation || 0),
		totemCount,
		antiAfk: botInstance.antiAfkService?.isEnabled ?? false,
		isNavigating: botInstance.smartPathfinderService?.getIsNavigating() ?? false,
		currentGoal: botInstance.smartPathfinderService?.getCurrentGoal() ?? null,
		pos: {
			x: Math.round(bot.entity.position.x * 10) / 10,
			y: Math.round(bot.entity.position.y * 10) / 10,
			z: Math.round(bot.entity.position.z * 10) / 10,
		},
		mainHand: mainHandItem ? mainHandItem.name : null,
	};
}

/**
 * Serialize full bot inventory (armor, offhand, 27 inventory slots, 9 hotbar slots)
 */
export function getSerializedInventory(botInstance: Minecraft): SerializedInventory {
	const bot = botInstance.bot;
	if (!bot?.inventory) {
		return { armor: [], offhand: null, main: [], hotbar: [] };
	}

	const serializeItem = (item: RawInventoryItem | null | undefined): SerializedItem | null => {
		if (!item) return null;
		const maxDurability = item.maxDurability || 0;
		const durabilityUsed = item.durabilityUsed || 0;
		const durabilityLeft = maxDurability > 0 ? Math.max(0, maxDurability - durabilityUsed) : null;
		const durabilityPct = maxDurability > 0 ? Math.round(((maxDurability - durabilityUsed) / maxDurability) * 100) : null;

		const enchantments = (item.enchants || []).map((e) => ({
			name: e.name,
			lvl: e.lvl,
		}));

		return {
			name: item.name,
			displayName: item.displayName || item.name,
			count: item.count,
			slot: item.slot,
			maxDurability,
			durabilityLeft,
			durabilityPct,
			enchantments,
			customName: item.customName || null,
		};
	};

	// Armor slots (5: helmet, 6: chestplate, 7: leggings, 8: boots)
	const armor = [
		serializeItem(bot.inventory.slots[5] as unknown as RawInventoryItem),
		serializeItem(bot.inventory.slots[6] as unknown as RawInventoryItem),
		serializeItem(bot.inventory.slots[7] as unknown as RawInventoryItem),
		serializeItem(bot.inventory.slots[8] as unknown as RawInventoryItem),
	];

	// Offhand (slot 45)
	const offhand = serializeItem(bot.inventory.slots[45] as unknown as RawInventoryItem);

	// Main Inventory (slots 9 to 35)
	const main: (SerializedItem | null)[] = [];
	for (let i = 9; i <= 35; i++) {
		main.push(serializeItem(bot.inventory.slots[i] as unknown as RawInventoryItem));
	}

	// Hotbar (slots 36 to 44)
	const hotbar: (SerializedItem | null)[] = [];
	for (let i = 36; i <= 44; i++) {
		hotbar.push(serializeItem(bot.inventory.slots[i] as unknown as RawInventoryItem));
	}

	return { armor, offhand, main, hotbar };
}
