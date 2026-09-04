import { Bot } from "mineflayer";
import { Vec3 } from "vec3";
import { Minecraft } from "../../structures/Minecraft";

export type HighwayAxis = "+X" | "-X" | "+Z" | "-Z" | "++" | "+-" | "-+" | "--";

export interface HighwayState {
	axis: HighwayAxis;
	targetCoord: number;
	active: boolean;
	running: boolean;
	targetVec: Vec3;
	startTime: number;
	lastPos: Vec3;
	lastMoveTime: number;
	currentSpeedBps: number;
	lastStopReason?: string;
}

export class HighwayNavigationService {
	private main: Minecraft;
	private state: HighwayState | null = null;
	private tickInterval: NodeJS.Timeout | null = null;
	private isExecuting: boolean = false;
	private lastLogTime: number = 0;
	private lastSpeedCalcTime: number = 0;
	private lastSpeedPos: Vec3 | null = null;
	private lastKnownStopReason: string = "NONE";
	private commandUser?: string;

	constructor(main: Minecraft) {
		this.main = main;
	}

	/**
	 * Parse string axis into HighwayAxis enum
	 */
	public parseAxis(raw: string): HighwayAxis | null {
		const clean = raw.trim().toUpperCase();
		const valid: HighwayAxis[] = ["+X", "-X", "+Z", "-Z", "++", "+-", "-+", "--"];
		if (valid.includes(clean as HighwayAxis)) {
			return clean as HighwayAxis;
		}
		return null;
	}

	/**
	 * Start highway auto-centering and traveling along the specified axis
	 */
	public async startHighway(axis: HighwayAxis, targetCoord: number, commandUser?: string): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot?.entity) return false;

		this.commandUser = commandUser;
		this.stop("NEW_TASK_STARTED"); // Stop any existing highway task

		const currentPos = bot.entity.position.clone();
		const targetVec = this.calculateTargetVec(currentPos, axis, targetCoord);

		this.state = {
			axis,
			targetCoord,
			active: true,
			running: true,
			targetVec,
			startTime: Date.now(),
			lastPos: currentPos,
			lastMoveTime: Date.now(),
			currentSpeedBps: 0,
		};

		this.lastSpeedCalcTime = Date.now();
		this.lastSpeedPos = currentPos;
		this.lastLogTime = Date.now();

		this.main.client.logger.info(
			`[Highway] Starting ${axis} highway towards coord ${targetCoord} from (${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})`
		);

		// Align to center first (e.g. integer + 0.5)
		await this.alignToLaneCenter(axis);

		// Start navigation loop
		this.startHighwayLoop();
		return true;
	}

	/**
	 * Stop highway navigation with reason
	 */
	public stop(reason: string = "MANUAL_STOP"): void {
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}

		this.lastKnownStopReason = reason;

		if (this.state) {
			this.state.active = false;
			this.state.running = false;
			this.state.lastStopReason = reason;
		}

		const bot = this.main.bot;
		if (bot) {
			try {
				bot.clearControlStates();
			} catch {}
		}
		this.main.antiAfkService?.resume();
		this.main.client.logger.info(`[Highway] Navigation stopped. Reason: ${reason}`);

		if (bot && this.commandUser && reason !== "NEW_TASK_STARTED") {
			try {
				let msg = `[Highway] Đã dừng di chuyển. Lý do: ${reason}`;
				if (reason === "TARGET_REACHED") msg = `[Highway] Đã đến mốc tọa độ đích thành công!`;
				bot.whisper(this.commandUser, msg);
			} catch (err) {
				this.main.client.logger.debug("Whisper Error", String(err));
			}
		}
	}

	public getStatus(): HighwayState | null {
		return this.state;
	}

	public getLastStopReason(): string {
		return this.lastKnownStopReason;
	}

	/**
	 * Calculate target 3D vector from current position, axis and target coordinate
	 */
	private calculateTargetVec(current: Vec3, axis: HighwayAxis, target: number): Vec3 {
		const y = current.y;
		switch (axis) {
			case "+X":
				return new Vec3(target, y, Math.floor(current.z) + 0.5);
			case "-X":
				return new Vec3(target, y, Math.floor(current.z) + 0.5);
			case "+Z":
				return new Vec3(Math.floor(current.x) + 0.5, y, target);
			case "-Z":
				return new Vec3(Math.floor(current.x) + 0.5, y, target);
			case "++":
				return new Vec3(target, y, target);
			case "+-":
				return new Vec3(target, y, -target);
			case "-+":
				return new Vec3(-target, y, target);
			case "--":
				return new Vec3(-target, y, -target);
		}
	}

	/**
	 * Align bot to the center of the highway block line
	 */
	private async alignToLaneCenter(axis: HighwayAxis): Promise<void> {
		const bot = this.main.bot;
		if (!bot?.entity) return;

		// Look towards the heading direction immediately
		const yaw = this.getYawForAxis(axis);
		try {
			await bot.look(yaw, 0, false);
		} catch {}
	}

	/**
	 * Determine Yaw radian for a given axis
	 */
	private getYawForAxis(axis: HighwayAxis): number {
		// Mineflayer Yaw: -Z is 0/2PI, +X is -PI/2, +Z is PI, -X is PI/2
		switch (axis) {
			case "-Z":
				return 0;
			case "+X":
				return -Math.PI / 2;
			case "+Z":
				return Math.PI;
			case "-X":
				return Math.PI / 2;
			case "++":
				return -3 * Math.PI / 4;
			case "+-":
				return -Math.PI / 4;
			case "-+":
				return 3 * Math.PI / 4;
			case "--":
				return Math.PI / 4;
		}
	}

	/**
	 * Main loop for highway movement & hazard avoidance
	 */
	private startHighwayLoop(): void {
		this.main.antiAfkService?.pause();

		this.tickInterval = setInterval(async () => {
			if (!this.state?.active || this.isExecuting) return;

			const bot = this.main.bot;
			if (!bot?.entity) {
				this.stop("BOT_ENTITY_NOT_FOUND");
				return;
			}

			this.isExecuting = true;
			try {
				const pos = bot.entity.position;
				const now = Date.now();

				// 1. Check target arrival
				const reached = this.checkIfTargetReached(pos, this.state);
				if (reached) {
					this.main.client.logger.info(
						`[Highway] Arrived at target coordinate ${this.state.targetCoord} on ${this.state.axis}! Current Pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`
					);
					this.stop("TARGET_REACHED");
					return;
				}

				// 2. Check hazard ahead (Lava, Portal, Void pit)
				const hazard = this.detectHazardAhead(bot, this.state.axis);
				if (hazard) {
					this.main.client.logger.warn(
						`[Highway] Hazard detected ahead: ${hazard.name} at (${hazard.pos.x}, ${hazard.pos.y}, ${hazard.pos.z}). Stopping navigation.`
					);
					bot.clearControlStates();
					this.stop(`HAZARD_${hazard.name.toUpperCase().replace(/\s+/g, "_")}`);
					return;
				}

				// 3. Speed & Stuck Detection
				const elapsedSpeed = (now - this.lastSpeedCalcTime) / 1000;
				if (elapsedSpeed >= 1.0 && this.lastSpeedPos) {
					const distMoved = Math.hypot(pos.x - this.lastSpeedPos.x, pos.z - this.lastSpeedPos.z);
					this.state.currentSpeedBps = distMoved / elapsedSpeed;

					if (distMoved >= 0.3) {
						this.state.lastMoveTime = now;
						this.state.lastPos = pos.clone();
					}

					this.lastSpeedPos = pos.clone();
					this.lastSpeedCalcTime = now;
				}

				// Stuck check (over 3.5s with minimal displacement)
				const stuckDurationMs = now - this.state.lastMoveTime;
				if (stuckDurationMs > 3500) {
					const forwardVec = this.getForwardVector(this.state.axis);
					const headObstacle = bot.blockAt(pos.offset(forwardVec.x, 1, forwardVec.z));
					const bodyObstacle = bot.blockAt(pos.offset(forwardVec.x, 0, forwardVec.z));

					this.main.client.logger.warn(
						`[Highway] Bot appears stuck at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) for ${(stuckDurationMs / 1000).toFixed(1)}s! ` +
						`Obstacle ahead: Head=[${headObstacle?.name || "air"}], Body=[${bodyObstacle?.name || "air"}]. Trying unstuck jump.`
					);

					// Attempt unstuck jump
					bot.setControlState("jump", true);
					bot.setControlState("forward", true);
					bot.setControlState("sprint", true);

					if (stuckDurationMs > 8000) {
						this.stop(`STUCK_BY_OBSTACLE_${bodyObstacle?.name || "UNKNOWN"}`);
						return;
					}
				}

				// 4. Periodic telemetry log (every 4s)
				if (now - this.lastLogTime >= 4000) {
					const blockUnder = bot.blockAt(pos.offset(0, -0.5, 0));
					this.main.client.logger.info(
						`[Highway Telemetry] Pos: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) | Speed: ${this.state.currentSpeedBps.toFixed(1)} bps | Floor: ${blockUnder?.name || "air"} | onGround: ${bot.entity.onGround}`
					);
					this.lastLogTime = now;
				}

				// 5. Normal movement controls
				const blockUnder = bot.blockAt(pos.offset(0, -0.5, 0));
				const isIce = blockUnder?.name.includes("ice");

				// Keep correct yaw heading
				const yaw = this.getYawForAxis(this.state.axis);
				await bot.look(yaw, 0, false);

				bot.setControlState("forward", true);
				bot.setControlState("sprint", true);

				if (isIce && bot.entity.onGround) {
					bot.setControlState("jump", true);
				} else if (!isIce && stuckDurationMs <= 3500) {
					bot.setControlState("jump", false);
				}
			} catch (err) {
				this.main.client.logger.error(`[Highway] Error in highway loop: ${err}`);
			} finally {
				this.isExecuting = false;
			}
		}, 100);
	}

	/**
	 * Check if the bot has crossed or reached target
	 */
	private checkIfTargetReached(pos: Vec3, state: HighwayState): boolean {
		const target = state.targetCoord;
		switch (state.axis) {
			case "+X":
				return pos.x >= target;
			case "-X":
				return pos.x <= target;
			case "+Z":
				return pos.z >= target;
			case "-Z":
				return pos.z <= target;
			case "++":
				return pos.x >= target || pos.z >= target;
			case "+-":
				return pos.x >= target || pos.z <= -target;
			case "-+":
				return pos.x <= -target || pos.z >= target;
			case "--":
				return pos.x <= -target || pos.z <= -target;
		}
	}

	/**
	 * Detect lava, portal, or missing floor ahead
	 */
	private detectHazardAhead(bot: Bot, axis: HighwayAxis): { name: string; pos: Vec3 } | null {
		const pos = bot.entity.position;
		const forwardVec = this.getForwardVector(axis);

		// Scan 1 to 2 blocks ahead
		for (let dist = 1; dist <= 2; dist++) {
			const checkPos = pos.offset(forwardVec.x * dist, 0, forwardVec.z * dist);
			const headBlock = bot.blockAt(checkPos.offset(0, 1, 0));
			const bodyBlock = bot.blockAt(checkPos);
			const footBlock = bot.blockAt(checkPos.offset(0, -1, 0));
			const groundBlock = bot.blockAt(checkPos.offset(0, -2, 0));

			// Nether portal block avoidance
			if (
				headBlock?.name?.includes("portal") ||
				bodyBlock?.name?.includes("portal") ||
				footBlock?.name?.includes("portal")
			) {
				return { name: "Nether Portal Block", pos: checkPos };
			}

			// Lava or fire hazard
			if (
				bodyBlock?.name?.includes("lava") ||
				bodyBlock?.name?.includes("fire") ||
				footBlock?.name?.includes("lava") ||
				footBlock?.name?.includes("fire")
			) {
				return { name: "Lava or Fire", pos: checkPos };
			}

			// Deep pit / void check: Only trigger if both 1 & 2 blocks below are empty
			if (
				dist === 1 &&
				(!footBlock || footBlock.boundingBox === "empty") &&
				(!groundBlock || groundBlock.boundingBox === "empty")
			) {
				const deepBlock = bot.blockAt(checkPos.offset(0, -3, 0));
				if (!deepBlock || deepBlock.boundingBox === "empty") {
					return { name: "Deep Pit / Void Fall", pos: checkPos.offset(0, -1, 0) };
				}
			}
		}

		return null;
	}

	private getForwardVector(axis: HighwayAxis): { x: number; z: number } {
		switch (axis) {
			case "+X":
				return { x: 1, z: 0 };
			case "-X":
				return { x: -1, z: 0 };
			case "+Z":
				return { x: 0, z: 1 };
			case "-Z":
				return { x: 0, z: -1 };
			case "++":
				return { x: 1, z: 1 };
			case "+-":
				return { x: 1, z: -1 };
			case "-+":
				return { x: -1, z: 1 };
			case "--":
				return { x: -1, z: -1 };
		}
	}
}
