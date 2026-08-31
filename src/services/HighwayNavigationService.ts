import { Vec3 } from "vec3";
import { Minecraft } from "../structures/Minecraft";

export type HighwayAxis = "+X" | "-X" | "+Z" | "-Z" | "++" | "+-" | "-+" | "--";

export interface HighwayState {
	axis: HighwayAxis;
	targetCoord: number;
	active: boolean;
	running: boolean;
	targetVec: Vec3;
}

export class HighwayNavigationService {
	private main: Minecraft;
	private state: HighwayState | null = null;
	private tickInterval: NodeJS.Timeout | null = null;
	private isExecuting: boolean = false;

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
	public async startHighway(axis: HighwayAxis, targetCoord: number): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot?.entity) return false;

		this.stop(); // Stop any existing highway task

		const currentPos = bot.entity.position;
		const targetVec = this.calculateTargetVec(currentPos, axis, targetCoord);

		this.state = {
			axis,
			targetCoord,
			active: true,
			running: false,
			targetVec,
		};

		this.main.client.logger.info(
			`[Highway] Starting ${axis} highway towards coord ${targetCoord} from (${currentPos.x.toFixed(0)}, ${currentPos.z.toFixed(0)})`
		);

		// Align to center first (e.g. integer + 0.5)
		await this.alignToLaneCenter(axis);

		// Start navigation loop
		this.startHighwayLoop();
		return true;
	}

	/**
	 * Stop highway navigation
	 */
	public stop(): void {
		if (this.tickInterval) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}

		if (this.state) {
			this.state.active = false;
			this.state.running = false;
			this.state = null;
		}

		const bot = this.main.bot;
		if (bot) {
			try {
				bot.clearControlStates();
			} catch {}
		}

		this.main.antiAfkService?.resume();
		this.main.client.logger.info(`[Highway] Highway navigation stopped.`);
	}

	public getStatus(): HighwayState | null {
		return this.state;
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

		const pos = bot.entity.position;
		let targetX = pos.x;
		let targetZ = pos.z;

		if (axis === "+X" || axis === "-X") {
			// Center on Z
			targetZ = Math.floor(pos.z) + 0.5;
		} else if (axis === "+Z" || axis === "-Z") {
			// Center on X
			targetX = Math.floor(pos.x) + 0.5;
		}

		// Look towards the heading direction
		const yaw = this.getYawForAxis(axis);
		await bot.look(yaw, 0, true);

		// Slight micro-move to center if offset is large
		const offsetDist = Math.hypot(pos.x - targetX, pos.z - targetZ);
		if (offsetDist > 0.3) {
			await this.main.smartPathfinderService?.moveTo(targetX, pos.y, targetZ, 0.2);
			await new Promise((r) => setTimeout(r, 500));
		}
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
				this.stop();
				return;
			}

			this.isExecuting = true;
			try {
				const pos = bot.entity.position;
				const reached = this.checkIfTargetReached(pos, this.state);
				if (reached) {
					this.main.client.logger.info(
						`[Highway] Arrived at target coordinate ${this.state.targetCoord} on ${this.state.axis}!`
					);
					this.stop();
					return;
				}

				// Check hazard ahead (Lava, Portal, Void pit)
				const hazard = this.detectHazardAhead(bot, this.state.axis);
				if (hazard) {
					this.main.client.logger.warn(`[Highway] Hazard detected ahead: ${hazard}. Pausing sprint.`);
					bot.clearControlStates();
					// Try pathfinding a small safe distance around if possible or stop
					this.stop();
					return;
				}

				// Check floor material under feet (Ice vs normal block)
				const blockUnder = bot.blockAt(pos.offset(0, -0.5, 0));
				const isIce = blockUnder?.name.includes("ice");

				// Keep correct yaw heading
				const yaw = this.getYawForAxis(this.state.axis);
				await bot.look(yaw, 0, false);

				// Sprinting and jumping on ice for high speed
				bot.setControlState("forward", true);
				bot.setControlState("sprint", true);

				if (isIce && bot.entity.onGround) {
					bot.setControlState("jump", true);
				} else {
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
				return pos.x >= target && pos.z >= target;
			case "+-":
				return pos.x >= target && pos.z <= -target;
			case "-+":
				return pos.x <= -target && pos.z >= target;
			case "--":
				return pos.x <= -target && pos.z <= -target;
		}
	}

	/**
	 * Detect lava, portal, or missing floor ahead
	 */
	private detectHazardAhead(bot: any, axis: HighwayAxis): string | null {
		const pos = bot.entity.position;
		const forwardVec = this.getForwardVector(axis);

		// Scan 1 to 3 blocks ahead
		for (let dist = 1; dist <= 3; dist++) {
			const checkPos = pos.offset(forwardVec.x * dist, 0, forwardVec.z * dist);
			const headBlock = bot.blockAt(checkPos.offset(0, 1, 0));
			const bodyBlock = bot.blockAt(checkPos);
			const footBlock = bot.blockAt(checkPos.offset(0, -1, 0));

			// Nether portal block avoidance
			if (
				headBlock?.name?.includes("portal") ||
				bodyBlock?.name?.includes("portal") ||
				footBlock?.name?.includes("portal")
			) {
				return "Nether Portal Block";
			}

			// Lava or fire hazard
			if (
				bodyBlock?.name?.includes("lava") ||
				bodyBlock?.name?.includes("fire") ||
				footBlock?.name?.includes("lava")
			) {
				return "Lava or Fire";
			}

			// Pit/Void fall detection
			if (
				(!footBlock || footBlock.boundingBox === "empty") &&
				dist === 1
			) {
				const deepBlock = bot.blockAt(checkPos.offset(0, -3, 0));
				if (!deepBlock || deepBlock.boundingBox === "empty") {
					return "Deep Pit / Void Fall";
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
