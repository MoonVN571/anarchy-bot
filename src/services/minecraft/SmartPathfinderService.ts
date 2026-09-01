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
	private eventsRegistered: boolean = false;

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
		if (!bot || !(bot as any).pathfinder || this.eventsRegistered) return;
		this.eventsRegistered = true;

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
				if (this.isNavigating && !this.isNavigatingToLobbyNpc && this.waypointQueue.length === 0) {
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
				} catch { }
			}

			try {
				bot.clearControlStates();
			} catch { }
		}

		viewerManager.broadcastPathUpdate(this.main.config.id, []);
		this.onNavigationComplete(false);
		this.main.client.logger.info(`[SmartPathfinder] Emergency stop executed.`);
	}

	/**
	 * Navigate to lobby NPC without fall damage constraints and click on NPC to enter server
	 */
	public async navigateToLobbyNpc(x: number = 48.5, y: number = 10, z: number = 40.5): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || !(bot as any).pathfinder) return false;

		if (this.isNavigatingToLobbyNpc) {
			this.main.client.logger.info(`[Lobby] Lobby NPC navigation refreshed. Target: (${x}, ${y}, ${z})`);
			try {
				(bot.pathfinder as any).setGoal(new GoalNear(x, y, z, 2));
			} catch { }
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

		const currentPos = bot.entity?.position;
		const posStr = currentPos ? `(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})` : "unknown";
		this.main.client.logger.info(
			`[Lobby] Navigating to NPC at (${x}, ${y}, ${z}) with zero fall damage limit... Current pos: ${posStr}`
		);

		const goalNear = new GoalNear(x, y, z, 2);
		const goalXZ = new GoalXZ(x, z);
		let usedGoal: any = goalNear;

		try {
			(bot.pathfinder as any).setGoal(goalNear);
		} catch (err) {
			this.main.client.logger.warn(`[Lobby] GoalNear failed, falling back to GoalXZ: ${err}`);
			try {
				(bot.pathfinder as any).setGoal(goalXZ);
				usedGoal = goalXZ;
			} catch (err2) {
				this.main.client.logger.error(`[Lobby] Failed to set GoalXZ: ${err2}`);
				this.isNavigatingToLobbyNpc = false;
				return false;
			}
		}

		const targetVec = new Vec3(x, y, z);
		let clickAttempts = 0;
		let lastPos: Vec3 | null = null;
		let logWalkTicks = 0;
		let isInteracting = false;

		this.lobbyNpcInterval = setInterval(async () => {
			if (!this.main.bot || !this.main.bot.entity) {
				this.clearLobbyNpcTimer();
				return;
			}

			// Only stop if bot has joined the main server
			if (this.main.currentServer === Server.Main) {
				this.clearLobbyNpcTimer();
				this.isNavigatingToLobbyNpc = false;
				this.isNavigating = false;
				(this.main.bot.pathfinder as any)?.setGoal(null);
				try {
					this.main.bot.clearControlStates();
				} catch { }
				this.initMovements();
				return;
			}

			const pos = this.main.bot.entity.position;
			const dist = pos.distanceTo(targetVec);

			// Within interaction distance
			if (dist <= 4.0) {
				try {
					bot.clearControlStates();
				} catch { }

				if (isInteracting) return;
				isInteracting = true;
				clickAttempts++;

				await this.interactWithNpcAt(targetVec, clickAttempts);
				isInteracting = false;

				if (clickAttempts >= 10) {
					this.clearLobbyNpcTimer();
					this.isNavigatingToLobbyNpc = false;
				}
			} else {
				// Actively move towards targetVec
				const isMoving = (bot.pathfinder as any).isMoving();
				logWalkTicks++;
				if (logWalkTicks % 3 === 0) {
					this.main.client.logger.info(
						`[Lobby] Walking to NPC (${x}, ${y}, ${z}) - Current: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) - Dist: ${dist.toFixed(1)}m`
					);
				}

				if (!isMoving) {
					// Direct movement fallback: look at target & walk forward
					try {
						await bot.lookAt(new Vec3(x, pos.y, z), true);
						bot.setControlState("forward", true);
						bot.setControlState("sprint", true);

						// If stuck in same position, jump to unstick
						if (lastPos && lastPos.distanceTo(pos) < 0.2) {
							bot.setControlState("jump", true);
							setTimeout(() => {
								if (bot) bot.setControlState("jump", false);
							}, 350);
						}
					} catch { }

					// Also re-apply pathfinder goal
					try {
						usedGoal = usedGoal === goalNear ? goalXZ : goalNear;
						(bot.pathfinder as any).setGoal(usedGoal);
					} catch { }
				}

				lastPos = pos.clone();
			}
		}, 2000);

		return true;
	}

	/**
	 * Click and interact with NPC at the target coordinate without spamming
	 */
	public async interactWithNpcAt(targetVec: Vec3, attemptNum: number = 1): Promise<void> {
		const bot = this.main.bot;
		if (!bot || !bot.entity) return;

		try {
			// 1. Chuyển hotbar sang ô 3 (index 2 trong Mineflayer)
			try {
				bot.setQuickBarSlot(2);
			} catch { }

			// 2. Quét và log toàn bộ các thực thể xung quanh (bán kính 6 block) để debug
			const allNearby = Object.values(bot.entities).filter((e: any) => {
				if (!e || e === bot.entity) return false;
				return bot.entity.position.distanceTo(e.position) <= 6.0;
			});

			this.main.client.logger.info(
				`[Lobby] --- Quét thực thể xung quanh (${allNearby.length} entities gần bot) ---`
			);
			for (const e of allNearby) {
				const name = (e as any).customName || (e as any).displayName || (e as any).username || (e as any).name || "unnamed";
				const dist = bot.entity.position.distanceTo(e.position).toFixed(2);
				this.main.client.logger.info(
					`[Lobby Entity] ID: ${e.id} | Type: ${e.type} (${e.name}) | Name: "${name}" | Pos: (${e.position.x.toFixed(2)}, ${e.position.y.toFixed(2)}, ${e.position.z.toFixed(2)}) | Dist: ${dist}m`
				);
			}

			// Tọa độ NPC đích: 48.814, 10, 40.392
			const exactNpcPos = new Vec3(48.814, 10, 40.392);

			// 3. Lọc bỏ item_frame, item, arrow và tìm thực thể gần tọa độ (48.814, 10, 40.392) nhất
			const validEntities = allNearby.filter((e: any) => {
				if (!e || e === bot.entity) return false;
				const type = (e.type || "").toLowerCase();
				const name = (e.name || "").toLowerCase();
				if (type.includes("item_frame") || name.includes("item_frame")) return false;
				if (type === "item" || name === "item") return false;
				if (type === "arrow" || name === "arrow") return false;
				return e.position.distanceTo(exactNpcPos) <= 4.0 || bot.entity.position.distanceTo(e.position) <= 4.0;
			});

			// Sắp xếp theo khoảng cách gần nhất tới (48.814, 10, 40.392), ưu tiên Player/Living
			validEntities.sort((a: any, b: any) => {
				const isPlayerA = a.type === "player" || a.name === "player" || a.username ? 1 : 0;
				const isPlayerB = b.type === "player" || b.name === "player" || b.username ? 1 : 0;
				const distA = a.position.distanceTo(exactNpcPos);
				const distB = b.position.distanceTo(exactNpcPos);

				// Nếu cả 2 đều ở gần tọa độ đích chênh lệch dưới 0.8m, ưu tiên Player
				if (isPlayerA !== isPlayerB && Math.abs(distA - distB) < 0.8) {
					return isPlayerB - isPlayerA;
				}
				return distA - distB;
			});

			const targetEntity = validEntities[0];

			if (targetEntity) {
				const distToNpcPos = targetEntity.position.distanceTo(exactNpcPos).toFixed(2);
				this.main.client.logger.info(
					`[Lobby] -> Bấm NPC gần (48.814, 10, 40.392) nhất: [ID #${targetEntity.id}] ${targetEntity.type}/${targetEntity.name} tại (${targetEntity.position.x.toFixed(2)}, ${targetEntity.position.y.toFixed(2)}, ${targetEntity.position.z.toFixed(2)}) - Cách đích: ${distToNpcPos}m (attempt #${attemptNum})`
				);

				// Nhìn vào thân NPC
				await bot.lookAt(targetEntity.position.offset(0, 1.2, 0), true).catch(() => { });

				// Chuột phải (activateEntity)
				try {
					await bot.activateEntity(targetEntity);
				} catch { }

				// Chuột trái (attack)
				try {
					bot.attack(targetEntity);
				} catch { }

				// Dùng vật phẩm trên tay (useOn)
				try {
					(bot as any).useOn?.(targetEntity);
				} catch { }

				bot.swingArm("right");
			} else {
				// User facing: 59.7° yaw, -16.4° pitch (Minecraft F3)
				const targetFacingYaw = (-59.7 * Math.PI) / 180;
				const targetFacingPitch = (-16.4 * Math.PI) / 180;

				this.main.client.logger.info(
					`[Lobby] Looking at NPC target coords (${exactNpcPos.x}, ${exactNpcPos.y + 1.2}, ${exactNpcPos.z}) (attempt #${attemptNum})...`
				);
				await bot.look(targetFacingYaw, targetFacingPitch, true).catch(() => { });
				bot.swingArm("right");
			}

			// Kích hoạt vật phẩm trên tay (slot 3)
			try {
				bot.activateItem();
			} catch { }
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
