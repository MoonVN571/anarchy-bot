import { Movements, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { Minecraft } from "../../structures/Minecraft";
import { viewerManager } from "../web/ViewerManagerService";

const { GoalNear, GoalBlock, GoalXZ, GoalFollow } = goals;

export interface PathWaypoint {
	x: number;
	y: number;
	z: number;
}

export class SmartPathfinderService {
	private main: Minecraft;
	private movements: Movements | null = null;
	private isNavigating: boolean = false;
	private currentGoalDesc: string | null = null;
	private waypointQueue: PathWaypoint[] = [];
	private isExecutingQueue: boolean = false;

	constructor(main: Minecraft) {
		this.main = main;
	}

	/**
	 * Initialize movements configuration for anarchy survival
	 */
	public initMovements(): void {
		const bot = this.main.bot;
		if (!bot) return;

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const mcData = require("minecraft-data")(bot.version);
		const defaultMove = new Movements(bot);

		// Anarchy safety movement settings
		defaultMove.allowParkour = true;
		defaultMove.canDig = false; // Pure movement, do not break blocks
		defaultMove.maxDropDown = 3; // Safe drop down height (prevent high fall damage)
		defaultMove.allow1by1towers = false;
		defaultMove.allowSprinting = true;

		// Don't step into Nether Portal blocks
		const portalBlockId = mcData.blocksByName?.nether_portal?.id;
		if (portalBlockId) {
			defaultMove.blocksToAvoid.add(portalBlockId);
			defaultMove.blocksCantBreak.add(portalBlockId);
		}

		// Heavily avoid lava
		const lavaBlockId = mcData.blocksByName?.lava?.id;
		if (lavaBlockId) {
			defaultMove.blocksToAvoid.add(lavaBlockId);
		}

		this.movements = defaultMove;
		(bot.pathfinder as any).setMovements(this.movements);
		this.setupPathfinderEvents();
	}

	/**
	 * Setup event listeners on bot's pathfinder
	 */
	private setupPathfinderEvents(): void {
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return;

		// When path is calculated or updated
		bot.on("path_update" as any, (r: any) => {
			if (r && r.path) {
				const points = r.path.map((p: any) => ({ x: p.x, y: p.y, z: p.z }));
				viewerManager.broadcastPathUpdate(this.main.config.id, points);
			}
		});

		// When goal is reached
		bot.on("goal_reached" as any, () => {
			if (this.waypointQueue.length > 0) {
				this.executeNextWaypoint();
			} else {
				this.onNavigationComplete(true);
			}
		});

		// When path reset or stopped
		bot.on("path_reset" as any, (reason: string) => {
			if (reason === "interrupted" || reason === "stop" || reason === "stuck") {
				if (this.isNavigating && this.waypointQueue.length === 0) {
					this.onNavigationComplete(false);
				}
			}
		});
	}

	/**
	 * Move to target coordinate (X, Y, Z) with auto Y fallback if omitted
	 */
	public async moveTo(x: number, y?: number, z?: number, range: number = 1): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return false;

		if (z === undefined && y !== undefined) {
			// If called as moveTo(x, z)
			z = y;
			y = undefined;
		}

		if (z === undefined) return false;

		if (!this.movements) {
			this.initMovements();
		}

		// Pause Anti-AFK while pathfinding
		this.main.antiAfkService?.pause();
		this.isNavigating = true;

		const currentPos = bot.entity.position;
		const targetVec = new Vec3(x, y ?? currentPos.y, z);
		const distance = currentPos.distanceTo(targetVec);

		this.main.client.logger.info(
			`[SmartPathfinder] Moving to (${x}, ${y !== undefined ? y : "auto"}, ${z}) - Dist: ${distance.toFixed(1)}m`
		);

		// If distance is very large (> 120 blocks), split into Waypoint chunks
		if (distance > 120) {
			this.createWaypointChunks(currentPos, targetVec, 80);
			this.currentGoalDesc = `Waypoint (${x}, ${z})`;
			this.executeNextWaypoint();
			return true;
		}

		let goal: any;
		if (y !== undefined) {
			goal = range <= 0 ? new GoalBlock(x, y, z) : new GoalNear(x, y, z, range);
			this.currentGoalDesc = `(${x}, ${y}, ${z})`;
		} else {
			goal = new GoalXZ(x, z);
			this.currentGoalDesc = `(${x}, ${z})`;
		}

		try {
			(bot.pathfinder as any).setGoal(goal);
			return true;
		} catch (err) {
			this.main.client.logger.error(`[SmartPathfinder] Error setting goal: ${err}`);
			this.onNavigationComplete(false);
			return false;
		}
	}

	/**
	 * Follow a specific player entity
	 */
	public followPlayer(username: string, range: number = 3): boolean {
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return false;

		const target = bot.players[username]?.entity;
		if (!target) return false;

		if (!this.movements) {
			this.initMovements();
		}

		this.main.antiAfkService?.pause();
		this.isNavigating = true;
		this.currentGoalDesc = `Follow ${username}`;

		try {
			const goal = new GoalFollow(target, range);
			(bot.pathfinder as any).setGoal(goal, true);
			return true;
		} catch (err) {
			this.main.client.logger.error(`[SmartPathfinder] Follow error: ${err}`);
			this.onNavigationComplete(false);
			return false;
		}
	}

	/**
	 * Emergency stop for pathfinding and all movement controls
	 */
	public stop(): void {
		const bot = this.main.bot;
		this.waypointQueue = [];
		this.isExecutingQueue = false;

		if (bot) {
			if ((bot as any).pathfinder) {
				try {
					(bot.pathfinder as any).setGoal(null);
					(bot.pathfinder as any).stop();
				} catch {}
			}

			try {
				bot.clearControlStates();
			} catch {}
		}

		viewerManager.broadcastPathUpdate(this.main.config.id, []);
		this.onNavigationComplete(false);
		this.main.client.logger.info(`[SmartPathfinder] Emergency stop executed.`);
	}

	/**
	 * Chunk a long distance path into intermediate waypoints
	 */
	private createWaypointChunks(start: Vec3, end: Vec3, stepSize: number): void {
		this.waypointQueue = [];
		const totalDist = start.distanceTo(end);
		const steps = Math.ceil(totalDist / stepSize);

		for (let i = 1; i <= steps; i++) {
			const ratio = i / steps;
			const wp = {
				x: Math.round(start.x + (end.x - start.x) * ratio),
				y: Math.round(start.y + (end.y - start.y) * ratio),
				z: Math.round(start.z + (end.z - start.z) * ratio),
			};
			this.waypointQueue.push(wp);
		}
	}

	/**
	 * Pop and execute the next waypoint from queue
	 */
	private executeNextWaypoint(): void {
		if (this.waypointQueue.length === 0) {
			this.onNavigationComplete(true);
			return;
		}

		const nextWp = this.waypointQueue.shift()!;
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return;

		const isFinal = this.waypointQueue.length === 0;
		const goal = isFinal
			? new GoalNear(nextWp.x, nextWp.y, nextWp.z, 1)
			: new GoalNear(nextWp.x, nextWp.y, nextWp.z, 3);

		try {
			(bot.pathfinder as any).setGoal(goal);
		} catch (err) {
			this.main.client.logger.error(`[SmartPathfinder] Waypoint error: ${err}`);
			this.onNavigationComplete(false);
		}
	}

	/**
	 * Cleanup on navigation finish or stop
	 */
	private onNavigationComplete(success: boolean): void {
		this.isNavigating = false;
		this.currentGoalDesc = null;
		this.waypointQueue = [];
		this.isExecutingQueue = false;

		// Clear path visual on web viewer
		viewerManager.broadcastPathUpdate(this.main.config.id, []);

		// Resume Anti-AFK
		this.main.antiAfkService?.resume();

		if (success) {
			this.main.client.logger.info(`[SmartPathfinder] Reached destination.`);
		}
	}

	public getIsNavigating(): boolean {
		return this.isNavigating;
	}

	public getCurrentGoal(): string | null {
		return this.currentGoalDesc;
	}
}
