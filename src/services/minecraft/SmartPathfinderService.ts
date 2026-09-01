import { Movements, goals } from "mineflayer-pathfinder";
import { Vec3 } from "vec3";
import { Minecraft } from "../../structures/Minecraft";
import { Server } from "../../typings";
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
	private lobbyNpcInterval: NodeJS.Timeout | null = null;
	private isNavigatingToLobbyNpc: boolean = false;

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
		this.clearLobbyNpcTimer();
		this.isNavigatingToLobbyNpc = false;

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
	 * Navigate to lobby NPC without fall damage constraints and click on NPC to enter server
	 */
	public async navigateToLobbyNpc(x: number = 48, y: number = 10, z: number = 40): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return false;

		if (this.isNavigatingToLobbyNpc) {
			this.main.client.logger.debug("Lobby", "Lobby NPC navigation is already in progress.");
			return true;
		}

		this.isNavigatingToLobbyNpc = true;
		this.clearLobbyNpcTimer();

		// Configure lobby movements (no fall damage in lobby, maxDropDown = 256)
		const lobbyMovements = new Movements(bot);
		lobbyMovements.allowParkour = true;
		lobbyMovements.canDig = false;
		lobbyMovements.maxDropDown = 256; // No fall damage in lobby
		lobbyMovements.allow1by1towers = false;
		lobbyMovements.allowSprinting = true;

		this.movements = lobbyMovements;
		(bot.pathfinder as any).setMovements(lobbyMovements);

		this.main.antiAfkService?.pause();
		this.isNavigating = true;
		this.currentGoalDesc = `Lobby NPC (${x}, ${y}, ${z})`;

		this.main.client.logger.info(
			`[Lobby] Navigating to NPC at (${x}, ${y}, ${z}) with zero fall damage limit...`
		);

		const goal = new GoalNear(x, y, z, 2);
		try {
			(bot.pathfinder as any).setGoal(goal);
		} catch (err) {
			this.main.client.logger.error(`[Lobby] Failed to set pathfinder goal: ${err}`);
			this.isNavigatingToLobbyNpc = false;
			return false;
		}

		const targetVec = new Vec3(x, y, z);
		let clickAttempts = 0;

		this.lobbyNpcInterval = setInterval(async () => {
			if (!this.main.bot || !this.main.bot.entity) {
				this.clearLobbyNpcTimer();
				return;
			}

			// If bot joined main server or spawn count advanced, cleanup and reset
			if (this.main.currentServer === Server.Main || this.main.spawnCount >= 2) {
				this.clearLobbyNpcTimer();
				this.isNavigatingToLobbyNpc = false;
				this.stop();
				this.initMovements();
				return;
			}

			const currentPos = this.main.bot.entity.position;
			const dist = currentPos.distanceTo(targetVec);

			// Within interaction distance
			if (dist <= 4.0) {
				clickAttempts++;
				await this.interactWithNpcAt(targetVec);

				if (clickAttempts >= 10) {
					this.clearLobbyNpcTimer();
					this.isNavigatingToLobbyNpc = false;
				}
			}
		}, 1000);

		return true;
	}

	/**
	 * Click and interact with NPC at the target coordinate
	 */
	public async interactWithNpcAt(targetVec: Vec3): Promise<void> {
		const bot = this.main.bot;
		if (!bot || !bot.entity) return;

		try {
			// Find closest NPC / player entity near target coordinates
			const npc = bot.nearestEntity((e: any) => {
				if (!e || e === bot.entity) return false;
				return e.position.distanceTo(targetVec) <= 5;
			});

			if (npc) {
				this.main.client.logger.info(
					`[Lobby] Found NPC ${npc.name || npc.username || ("entity #" + npc.id)} at ${npc.position}, interacting...`
				);
				await bot.lookAt(npc.position.offset(0, npc.height ? npc.height * 0.8 : 1.6, 0), true);
				await bot.activateEntity(npc);
			} else {
				this.main.client.logger.info(
					`[Lobby] Looking at NPC target coords (${targetVec.x}, ${targetVec.y + 1.5}, ${targetVec.z}) and clicking...`
				);
				await bot.lookAt(targetVec.offset(0, 1.5, 0), true);
				const nearest = bot.nearestEntity(
					(e: any) => e !== bot.entity && bot.entity.position.distanceTo(e.position) <= 4.5
				);
				if (nearest) {
					await bot.activateEntity(nearest);
				} else {
					bot.swingArm("right");
				}
			}
		} catch (err) {
			this.main.client.logger.error(`[Lobby] Error interacting with NPC: ${err}`);
		}
	}

	public clearLobbyNpcTimer(): void {
		if (this.lobbyNpcInterval) {
			clearInterval(this.lobbyNpcInterval);
			this.lobbyNpcInterval = null;
		}
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
