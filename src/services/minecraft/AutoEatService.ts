import { Item } from "prismarine-item";
import { Minecraft } from "../../structures/Minecraft";
import { Server } from "../../typings";

// Ranked food list (lower index = higher priority)
const STANDARD_FOODS = [
	"golden_carrot",
	"cooked_beef",
	"cooked_porkchop",
	"cooked_mutton",
	"cooked_salmon",
	"cooked_chicken",
	"baked_potato",
	"bread",
	"apple",
	"sweet_berries",
];

const EMERGENCY_FOODS = [
	"enchanted_golden_apple",
	"golden_apple",
	"golden_carrot",
	"cooked_beef",
	"cooked_porkchop",
];

export class AutoEatService {
	private main: Minecraft;
	private isEating: boolean = false;
	private checkInterval: NodeJS.Timeout | null = null;

	public isEnabled: boolean;
	public threshold: number;
	public isTotemEnabled: boolean;

	constructor(main: Minecraft) {
		this.main = main;
		this.isEnabled = process.env.AUTO_EAT_ENABLED !== "false";
		this.threshold = parseInt(process.env.AUTO_EAT_THRESHOLD || "16", 10);
		this.isTotemEnabled = process.env.AUTO_TOTEM_ENABLED !== "false";
	}

	/**
	 * Start health & food monitoring and totem check loops
	 */
	public start(): void {
		if (this.checkInterval) return;

		this.setupBotListeners();

		this.checkInterval = setInterval(() => {
			this.checkAndEat();
			if (this.isTotemEnabled) {
				this.checkAndEquipTotem();
			}
		}, 3000);

		this.main.client.logger.info(`[AutoEat] Service started (Threshold: ${this.threshold}, Auto-Totem: ${this.isTotemEnabled})`);
	}

	/**
	 * Stop monitoring
	 */
	public stop(): void {
		if (this.checkInterval) {
			clearInterval(this.checkInterval);
			this.checkInterval = null;
		}
		this.isEating = false;
	}

	/**
	 * Hook into bot events for reactive triggers
	 */
	private setupBotListeners(): void {
		const bot = this.main.bot;
		if (!bot) return;

		bot.on("health", () => {
			if (bot.health <= 8) {
				this.checkAndEat(true);
			}
			if (this.isTotemEnabled) {
				this.checkAndEquipTotem();
			}
		});
	}

	/**
	 * Main evaluate & eat function
	 */
	public async checkAndEat(emergency: boolean = false): Promise<boolean> {
		if (!this.isEnabled || this.isEating) return false;

		const bot = this.main.bot;
		if (!bot?.entity || !this.main.joined || this.main.currentServer !== Server.Main) return false;
		if (bot.health <= 0) return false;

		const needsFood = bot.food < this.threshold || (bot.health < 18 && bot.food < 20);
		if (!needsFood && !emergency) return false;

		const foodItem = this.findBestFood(emergency || bot.health <= 8);
		if (!foodItem) return false;

		return this.eatItem(foodItem);
	}

	/**
	 * Find the optimal food item from inventory
	 */
	private findBestFood(emergency: boolean): Item | null {
		const bot = this.main.bot;
		if (!bot) return null;

		const list = emergency ? EMERGENCY_FOODS : STANDARD_FOODS;
		const items = bot.inventory.items();

		for (const foodName of list) {
			const found = items.find((i) => i.name === foodName);
			if (found) return found;
		}

		// Fallback to any food item in inventory if none of the ranked items are found
		if (!emergency) {
			return items.find((i) => {
				// eslint-disable-next-line @typescript-eslint/no-require-imports
				const mcData = require("minecraft-data")(bot.version);
				const data = mcData.foodsByName?.[i.name];
				return !!data && !["rotten_flesh", "poisonous_potato", "spider_eye", "pufferfish"].includes(i.name);
			}) || null;
		}

		return null;
	}

	/**
	 * Execute the safe eating routine
	 */
	public async eatItem(foodItem: Item): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || this.isEating) return false;

		this.isEating = true;
		this.main.antiAfkService?.pause();

		// Save the current item in hand
		const prevItem = bot.inventory.slots[bot.getEquipmentDestSlot("hand")];

		try {
			this.main.client.logger.info(`[AutoEat] Eating ${foodItem.name} (Count: ${foodItem.count})`);

			// Equip food item in main hand
			await bot.equip(foodItem, "hand");

			// Consume the food
			await bot.consume();

			this.main.client.logger.info(`[AutoEat] Finished eating ${foodItem.name}`);

			// Restore previously held item if there was one
			if (prevItem && prevItem.name !== foodItem.name) {
				const existingPrev = bot.inventory.items().find((i) => i.type === prevItem.type);
				if (existingPrev) {
					try {
						await bot.equip(existingPrev, "hand");
					} catch { }
				}
			}

			return true;
		} catch (err) {
			this.main.client.logger.debug("AutoEat", `Error during consume: ${err}`);
			return false;
		} finally {
			this.isEating = false;
			this.main.antiAfkService?.resume();
			if (this.isTotemEnabled) {
				this.checkAndEquipTotem();
			}
		}
	}

	/**
	 * Equip Totem of Undying to off-hand if currently missing
	 */
	public async checkAndEquipTotem(): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot?.entity || !this.main.joined || this.isEating) return false;

		const offhandSlot = bot.getEquipmentDestSlot("off-hand");
		const currentOffhand = bot.inventory.slots[offhandSlot];

		if (currentOffhand && currentOffhand.name === "totem_of_undying") {
			return true; // Already equipped
		}

		const totemItem = bot.inventory.items().find((i) => i.name === "totem_of_undying");
		if (!totemItem) {
			return false; // No totem in inventory
		}

		try {
			await bot.equip(totemItem, "off-hand");
			this.main.client.logger.info(`[TotemKeeper] Equipped Totem of Undying to off-hand`);
			return true;
		} catch (err) {
			this.main.client.logger.debug("TotemKeeper", `Failed to equip totem: ${err}`);
			return false;
		}
	}

	public getIsEating(): boolean {
		return this.isEating;
	}
}
