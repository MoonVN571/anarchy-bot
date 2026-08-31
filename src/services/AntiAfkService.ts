import { Minecraft } from "../structures/Minecraft";
import { Server } from "../typings/types";
import { Vec3 } from "vec3";

export class AntiAfkService {
	private main: Minecraft;
	private timer: NodeJS.Timeout | null = null;
	private isRunning: boolean = false;
	private isActionExecuting: boolean = false;
	private isPaused: boolean = false;

	public isEnabled: boolean;
	public minIntervalMs: number;
	public maxIntervalMs: number;

	constructor(main: Minecraft) {
		this.main = main;
		this.isEnabled = process.env.ANTI_AFK_ENABLED !== "false";
		this.minIntervalMs = parseInt(process.env.ANTI_AFK_MIN_INTERVAL || "30000", 10);
		this.maxIntervalMs = parseInt(process.env.ANTI_AFK_MAX_INTERVAL || "90000", 10);

		if (this.minIntervalMs < 5000) this.minIntervalMs = 5000;
		if (this.maxIntervalMs < this.minIntervalMs) this.maxIntervalMs = this.minIntervalMs + 30000;
	}

	/**
	 * Start the Anti-AFK routine
	 */
	public start(): void {
		if (!this.isEnabled || this.isRunning) return;

		this.isRunning = true;
		this.isPaused = false;
		this.main.client.logger.info(`[Anti-AFK] Started for ${this.main.config.connection.host} (Interval: ${this.minIntervalMs / 1000}s - ${this.maxIntervalMs / 1000}s)`);
		this.scheduleNextAction();
	}

	/**
	 * Temporarily pause anti-afk (e.g. while moving or eating)
	 */
	public pause(): void {
		this.isPaused = true;
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}
	}

	/**
	 * Resume anti-afk if enabled
	 */
	public resume(): void {
		if (!this.isPaused || !this.isEnabled || !this.isRunning) return;
		this.isPaused = false;
		this.scheduleNextAction();
	}

	/**
	 * Set enabled state dynamically
	 */
	public setEnabled(enabled: boolean): void {
		this.isEnabled = enabled;
		if (!enabled) {
			this.stop();
		} else {
			this.start();
		}
	}

	/**
	 * Stop the Anti-AFK routine and clear control states
	 */
	public stop(): void {
		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		this.isRunning = false;
		this.isPaused = false;
		this.isActionExecuting = false;

		if (this.main.bot) {
			try {
				this.main.bot.clearControlStates();
			} catch {}
		}
	}

	/**
	 * Schedule next action after a randomized interval
	 */
	private scheduleNextAction(): void {
		if (!this.isRunning) return;

		if (this.timer) {
			clearTimeout(this.timer);
			this.timer = null;
		}

		const randomDelay = Math.floor(
			Math.random() * (this.maxIntervalMs - this.minIntervalMs + 1) + this.minIntervalMs
		);

		this.timer = setTimeout(async () => {
			this.timer = null;
			if (!this.isRunning) return;

			await this.performRandomAction();

			if (this.isRunning) {
				this.scheduleNextAction();
			}
		}, randomDelay);
	}

	/**
	 * Perform a single safe randomized action to prevent AFK kick
	 */
	public async performRandomAction(): Promise<void> {
		const bot = this.main.bot;
		if (!bot || !this.main.joined || this.main.currentServer !== Server.Main) return;
		if (bot.health <= 0 || this.isActionExecuting) return;

		this.isActionExecuting = true;

		try {
			// Random action type: 1 (Look), 2 (Swing), 3 (Sneak), 4 (Jump), 5 (Micro-Step)
			const actionPool = [1, 1, 2, 2, 3, 4, 5];
			const action = actionPool[Math.floor(Math.random() * actionPool.length)];

			switch (action) {
				case 1: // Camera Rotation (Look)
					await this.actionLook();
					break;
				case 2: // Arm Swing
					this.actionSwing();
					break;
				case 3: // Sneak pulse
					await this.actionSneak();
					break;
				case 4: // Micro-jump
					await this.actionJump();
					break;
				case 5: // Micro-step forward and back
					await this.actionMicroStep();
					break;
				default:
					await this.actionLook();
					break;
			}
		} catch (err) {
			this.main.client.logger.debug("Anti-AFK", `Error performing action: ${err}`);
		} finally {
			this.isActionExecuting = false;
		}
	}

	/**
	 * 1. Random subtle head rotation (±15 to ±45 degrees)
	 */
	private async actionLook(): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		const currentYaw = bot.entity.yaw;
		const currentPitch = bot.entity.pitch;

		const deltaYaw = (Math.random() * 60 - 30) * (Math.PI / 180);
		const deltaPitch = (Math.random() * 30 - 15) * (Math.PI / 180);

		const targetYaw = currentYaw + deltaYaw;
		const targetPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, currentPitch + deltaPitch));

		await bot.look(targetYaw, targetPitch, true);
	}

	/**
	 * 2. Arm swing
	 */
	private actionSwing(): void {
		const bot = this.main.bot;
		if (!bot) return;

		try {
			bot.swingArm("right");
		} catch {}
	}

	/**
	 * 3. Sneak pulse (400 - 800ms)
	 */
	private async actionSneak(): Promise<void> {
		const bot = this.main.bot;
		if (!bot) return;

		try {
			bot.setControlState("sneak", true);
			const duration = Math.floor(Math.random() * 400 + 400);
			await new Promise((res) => setTimeout(res, duration));
		} finally {
			if (bot) bot.setControlState("sneak", false);
		}
	}

	/**
	 * 4. Micro jump in place (checks clearance above head)
	 */
	private async actionJump(): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		// Check if space above head is clear (air)
		const pos = bot.entity.position;
		const blockAbove = bot.blockAt(pos.offset(0, 2, 0));
		if (blockAbove && blockAbove.boundingBox === "empty") {
			try {
				bot.setControlState("jump", true);
				await new Promise((res) => setTimeout(res, 200));
			} finally {
				if (bot) bot.setControlState("jump", false);
			}
		}
	}

	/**
	 * 5. Safe Micro-step (Forward 150ms, then Back 150ms)
	 */
	private async actionMicroStep(): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		const pos = bot.entity.position;
		const groundBlock = bot.blockAt(pos.offset(0, -1, 0));

		// Only step if ground is solid and safe
		if (!this.isSafeGround(groundBlock)) {
			await this.actionLook();
			return;
		}

		try {
			bot.setControlState("forward", true);
			await new Promise((res) => setTimeout(res, 150));
			bot.setControlState("forward", false);

			await new Promise((res) => setTimeout(res, 100));

			bot.setControlState("back", true);
			await new Promise((res) => setTimeout(res, 150));
		} finally {
			if (bot) {
				bot.setControlState("forward", false);
				bot.setControlState("back", false);
			}
		}
	}

	/**
	 * Check whether a block is solid and safe to stand on
	 */
	private isSafeGround(block: any): boolean {
		if (!block || block.boundingBox !== "block") return false;

		const name = block.name.toLowerCase();
		if (
			name.includes("lava") ||
			name.includes("fire") ||
			name.includes("water") ||
			name.includes("cactus") ||
			name.includes("sweet_berry") ||
			name.includes("air") ||
			name.includes("portal")
		) {
			return false;
		}

		return true;
	}
}
