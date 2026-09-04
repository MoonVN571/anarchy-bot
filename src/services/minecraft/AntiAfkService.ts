import type { Block } from "prismarine-block";
import { Minecraft } from "../../structures/Minecraft";
import { Server } from "../../typings";
import { ChatPriority } from "./ChatQueueService";

export class AntiAfkService {
	private main: Minecraft;
	private timer: NodeJS.Timeout | null = null;
	private isRunning: boolean = false;
	private isActionExecuting: boolean = false;
	private isPaused: boolean = false;
	private lastAction: number = -1;

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
			} catch { }
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
			// Random action type: 1 (Look), 2 (Interact/Swing), 3 (Sneak), 4 (Jump), 5 (Micro-Step), 6 (Wander), 7 (Hotbar Shuffle)
			const actionPool = [1, 1, 2, 3, 4, 5, 5, 6, 6, 7];
			
			let action = this.lastAction;
			while (action === this.lastAction) {
				action = actionPool[Math.floor(Math.random() * actionPool.length)];
			}
			this.lastAction = action;

			switch (action) {
				case 1: // Camera Rotation (Look)
					this.debugChat("Xoay góc nhìn mượt");
					await this.actionLook();
					break;
				case 2: // Interact / Arm Swing
					this.debugChat("Tương tác giả (đập block)");
					this.actionInteract();
					break;
				case 3: // Sneak pulse
					this.debugChat("Ngồi lén ngẫu nhiên");
					await this.actionSneak();
					break;
				case 4: // Micro-jump
					this.debugChat("Nhảy tại chỗ");
					await this.actionJump();
					break;
				case 5: // Micro-step forward and back
					this.debugChat("Bước nhỏ tới lui an toàn");
					await this.actionMicroStep();
					break;
				case 6: // Wander (rotate and walk safe direction)
					this.debugChat("Đi dạo loanh quanh");
					await this.actionRotateWalk();
					break;
				case 7: // Hotbar Shuffle
					this.debugChat("Cuộn đổi slot Hotbar");
					await this.actionHotbarShuffle();
					break;
				default:
					this.debugChat("Xoay góc nhìn mượt");
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
	 * Output debug messages to Minecraft chat (Only for testServer)
	 */
	private debugChat(actionDesc: string): void {
		if (this.main.config.id === "testServer" && this.main.bot) {
			this.main.chatQueue.send(`[Anti-AFK Debug] Thực hiện: ${actionDesc}`, ChatPriority.LOW);
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

		// Remove force=true for smooth looking (interpolate)
		await bot.look(targetYaw, targetPitch, false);

		// Compound action: randomly swing arm while looking
		if (Math.random() > 0.7) {
			this.actionInteract();
		}
	}

	/**
	 * 2. Interact (swing arm / punch)
	 */
	private actionInteract(): void {
		const bot = this.main.bot;
		if (!bot) return;

		try {
			bot.swingArm("right");
		} catch { }
	}

	/**
	 * 3. Sneak pulse (400 - 800ms)
	 */
	private async actionSneak(): Promise<void> {
		const bot = this.main.bot;
		if (!bot) return;

		try {
			bot.setControlState("sneak", true);
			const duration = Math.floor(Math.random() * 400 + 400); // 400ms - 800ms
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
				const duration = Math.floor(Math.random() * 50 + 200); // 200ms - 250ms
				await new Promise((res) => setTimeout(res, duration));
			} finally {
				if (bot) bot.setControlState("jump", false);
			}
		}
	}

	/**
	 * 5. Safe Micro-step (Random Forward, then Back)
	 */
	private async actionMicroStep(): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		const pos = bot.entity.position;
		const yaw = bot.entity.yaw;

		// Calculate block immediately in front (1 block distance)
		const dx = -Math.sin(yaw);
		const dz = -Math.cos(yaw);
		const targetPos = pos.offset(dx, 0, dz);

		const groundUnderTarget = bot.blockAt(targetPos.offset(0, -1, 0));
		const blockAtTarget = bot.blockAt(targetPos);
		const blockAboveTarget = bot.blockAt(targetPos.offset(0, 1, 0));

		// Check if we can safely walk forward (ground is solid, path is clear)
		if (
			!this.isSafeGround(groundUnderTarget) ||
			blockAtTarget?.boundingBox !== "empty" ||
			blockAboveTarget?.boundingBox !== "empty"
		) {
			await this.actionLook();
			return;
		}

		try {
			const forwardDur = Math.floor(Math.random() * 150 + 100); // 100-250ms
			bot.setControlState("sprint", false);
			bot.setControlState("forward", true);
			await new Promise((res) => setTimeout(res, forwardDur));
			bot.setControlState("forward", false);

			const pauseDur = Math.floor(Math.random() * 100 + 50); // 50-150ms
			await new Promise((res) => setTimeout(res, pauseDur));

			const backDur = Math.floor(Math.random() * 150 + 100); // 100-250ms
			bot.setControlState("back", true);
			await new Promise((res) => setTimeout(res, backDur));
		} finally {
			if (bot) {
				bot.setControlState("forward", false);
				bot.setControlState("back", false);
			}
		}
	}

	/**
	 * 6. Wander (Rotate to random angle, then walk forward if safe)
	 */
	private async actionRotateWalk(): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		// Rotate randomly
		const deltaYaw = (Math.random() * 180 - 90) * (Math.PI / 180);
		const targetYaw = bot.entity.yaw + deltaYaw;
		await bot.look(targetYaw, bot.entity.pitch, false);

		// Now check safety
		const pos = bot.entity.position;
		const dx = -Math.sin(bot.entity.yaw);
		const dz = -Math.cos(bot.entity.yaw);

		// Check blocks ahead
		let isSafe = true;
		for (let i = 1; i <= 2; i++) {
			const targetPos = pos.offset(dx * i, 0, dz * i);
			const groundBlock = bot.blockAt(targetPos.offset(0, -1, 0));
			const headBlock = bot.blockAt(targetPos.offset(0, 1, 0));
			const feetBlock = bot.blockAt(targetPos);

			if (
				!this.isSafeGround(groundBlock) ||
				feetBlock?.boundingBox !== "empty" ||
				headBlock?.boundingBox !== "empty"
			) {
				isSafe = false;
				break;
			}
		}

		if (!isSafe) {
			await this.actionSneak();
			return;
		}

		try {
			const walkDur = Math.floor(Math.random() * 400 + 400); // 400-800ms
			bot.setControlState("sprint", false);
			bot.setControlState("forward", true);
			
			// Compound Action: randomly jump while wandering
			if (Math.random() > 0.5) {
				bot.setControlState("jump", true);
				setTimeout(() => { if (bot) bot.setControlState("jump", false); }, 200);
			}

			await new Promise((res) => setTimeout(res, walkDur));
		} finally {
			if (bot) bot.setControlState("forward", false);
		}
	}

	/**
	 * 7. Hotbar Shuffle (change held item slot randomly)
	 */
	private async actionHotbarShuffle(): Promise<void> {
		const bot = this.main.bot;
		if (!bot) return;

		const originalSlot = bot.quickBarSlot;
		const randomSlot = Math.floor(Math.random() * 9);
		
		if (originalSlot === randomSlot) return; // Unlucky

		try {
			bot.setQuickBarSlot(randomSlot);
			// Hold the new item for a random short duration to simulate looking at it
			const duration = Math.floor(Math.random() * 500 + 300);
			await new Promise((res) => setTimeout(res, duration));
		} catch (err) {
			this.main.client.logger.debug("Anti-AFK", `Hotbar shuffle error: ${err}`);
		} finally {
			// Randomly decide whether to revert back to original slot or keep the new one
			if (Math.random() > 0.5 && bot) {
				bot.setQuickBarSlot(originalSlot);
			}
		}
	}

	/**
	 * Check whether a block is solid and safe to stand on
	 */
	private isSafeGround(block: Block | null): boolean {
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
