import { Goal, goals } from "@miner-org/mineflayer-baritone";
import { Bot } from "mineflayer";
import { Entity } from "prismarine-entity";
import { Vec3 } from "vec3";
import { Minecraft } from "../../structures/Minecraft";
import { Server } from "../../typings";
import { viewerManager } from "../web/ViewerManagerService";

const { GoalNear, GoalExact, GoalXZ, GoalXZNear } = goals;

export interface PathWaypoint {
	x: number;
	y: number;
	z: number;
}

export class SmartPathfinderService {
	private main: Minecraft;
	private isNavigating: boolean = false;
	private currentGoalDesc: string | null = null;
	private waypointQueue: PathWaypoint[] = [];
	private isExecutingQueue: boolean = false;
	private lobbyNpcInterval: NodeJS.Timeout | null = null;
	private isNavigatingToLobbyNpc: boolean = false;
	private eventsRegistered: boolean = false;
	private commandUser?: string;

	constructor(main: Minecraft) {
		this.main = main;
	}

	/**
	 * Initialize movements configuration for anarchy survival
	 */
	public initMovements(): void {
		const bot = this.main.bot;
		if (!bot || !bot.ashfinder) return;

		const ash = bot.ashfinder;

		// Safe Anarchy Movement Configuration
		if (ash.config) {
			ash.config.parkour = true;
			ash.config.breakBlocks = true; // Bật đập khối
			ash.config.placeBlocks = true; // Bật đặt khối (Bắc cầu, leo cột)
			ash.config.maxFallDist = 3; // Safe fall height limit (prevent high fall damage)
			ash.config.swimming = true;
			ash.config.allowSprinting = false; // Tắt tính năng chạy nhanh
			ash.config.thinkTimeout = 15000;
			ash.config.stuckTimeout = 4000; // Allow 4s to traverse slopes/jumps before replan
			
			// Cấm đập phá các khối nguy hiểm hoặc quan trọng
			ash.config.blocksToAvoid = [
				"lava", "nether_portal", "fire", "cobweb", "water",
				"obsidian", "bedrock", "ender_chest", "shulker_box",
				"chest", "trapped_chest", "barrel", "hopper", "dropper", "dispenser"
			];

			// Quy định các khối được phép lôi ra đặt làm cầu/cột
			ash.config.disposableBlocks = [
				"netherrack", "dirt", "cobblestone", "stone",
				"diorite", "granite", "andesite", "sandstone"
			];
		}

		// Disable ash.debug so it will NOT send /particle chat spam to the server
		ash.debug = false;

		this.setupPathfinderEvents();
	}

	/**
	 * Setup event listeners on bot's ashfinder
	 */
	private setupPathfinderEvents(): void {
		const bot = this.main.bot;
		if (!bot || !bot.ashfinder || this.eventsRegistered) return;
		this.eventsRegistered = true;

		const ash = bot.ashfinder;

		// When path is started or updated
		ash.on("pathStarted", (data: { path: { x: number; y: number; z: number }[]; status: string; goal: Goal }) => {
			if (data && data.path && Array.isArray(data.path)) {
				this.main.client.logger.info(
					`[SmartPathfinder] Path started (${data.path.length} nodes) | Status: ${data.status}`
				);
				const points = data.path.map((p) => ({ x: p.x, y: p.y, z: p.z }));
				viewerManager.broadcastPathUpdate(this.main.config.id, points);
			}
		});

		// When goal is reached
		ash.on("goal-reach", () => {
			if (this.waypointQueue.length > 0) {
				this.executeNextWaypoint();
			} else {
				this.main.client.logger.info(`[SmartPathfinder] Reached destination goal successfully!`);
				if (bot && this.isNavigating && this.commandUser) {
					try {
						bot.whisper(this.commandUser, `[Pathfinder] Đã đến đích thành công!`);
					} catch (err) {
						this.main.client.logger.debug("Whisper Error", String(err));
					}
				}
				this.onNavigationComplete(true);
			}
		});

		// When partial path is reached (blocked by terrain / replanning required)
		ash.on("goal-reach-partial" as any, () => {
			this.main.client.logger.warn(`[SmartPathfinder] Reached end of partial path, replanning next segment...`);
		});

		// When waypoint is reached along a path
		ash.on("waypoint-reached", (data: { waypoint?: { x: number; y: number; z: number }; index?: number }) => {
			if (data && data.waypoint) {
				this.main.client.logger.info(
					`[SmartPathfinder] Reached node waypoint #${data.index}: (${data.waypoint.x}, ${data.waypoint.y}, ${data.waypoint.z})`
				);
			}
		});

		// When path stopped or interrupted
		ash.on("stopped", () => {
			const pos = bot.entity?.position;
			const posStr = pos ? `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})` : "unknown";

			// Inspect block obstacles right in front of bot
			let obstacleInfo = "";
			let chatObstacleInfo = "Không rõ lý do";
			if (pos) {
				const yaw = bot.entity.yaw;
				const dx = -Math.sin(yaw);
				const dz = -Math.cos(yaw);
				const stepAhead = pos.offset(dx * 0.8, 0, dz * 0.8);
				const blockFeet = bot.blockAt(stepAhead);
				const blockHead = bot.blockAt(stepAhead.offset(0, 1, 0));
				obstacleInfo = ` | Obstacle ahead: Feet=[${blockFeet?.name || "air"}], Head=[${blockHead?.name || "air"}]`;
				
				if (blockFeet && blockFeet.name !== "air") {
					chatObstacleInfo = `Vướng block ${blockFeet.name} dưới chân`;
				} else if (blockHead && blockHead.name !== "air") {
					chatObstacleInfo = `Vướng block ${blockHead.name} trên đầu`;
				}
			}

			this.main.client.logger.info(
				`[SmartPathfinder] Navigation stopped at ${posStr}${obstacleInfo}`
			);

			if (this.isNavigating && !this.isNavigatingToLobbyNpc && this.waypointQueue.length === 0) {
				if (bot && this.commandUser) {
					try {
						bot.whisper(this.commandUser, `[Pathfinder] Đã dừng di chuyển tại ${posStr}. Lý do: ${chatObstacleInfo}`);
					} catch (err) {
						this.main.client.logger.debug("Whisper Error", String(err));
					}
				}
				this.onNavigationComplete(false);
			}
		});
	}

	/**
	 * Move to target coordinate (X, Y, Z) with auto Y fallback if omitted
	 */
	public async moveTo(x: number, y?: number, z?: number, range: number = 1, commandUser?: string): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || !bot.ashfinder) return false;
		
		this.commandUser = commandUser;

		if (z === undefined && y !== undefined) {
			// If called as moveTo(x, z)
			z = y;
			y = undefined;
		}

		if (z === undefined) return false;

		this.initMovements();

		// Stop any active navigation before setting a new goal
		try {
			bot.ashfinder.stop();
		} catch {}

		// Pause Anti-AFK while pathfinding
		this.main.antiAfkService?.pause();
		this.isNavigating = true;

		const currentPos = bot.entity.position;
		const targetVec = new Vec3(x, y ?? currentPos.y, z);
		const distance = currentPos.distanceTo(targetVec);

		this.main.client.logger.info(
			`[SmartPathfinder] Moving to (${x}, ${y !== undefined ? y : "auto"}, ${z}) - Dist: ${distance.toFixed(1)}m`
		);

		// If distance is large (> 45 blocks), split into safe loaded-chunk waypoint chunks (35m step)
		if (distance > 45) {
			this.createWaypointChunks(currentPos, targetVec, 35);
			this.currentGoalDesc = `Waypoint (${x}, ${z})`;
			this.executeNextWaypoint();
			return true;
		}

		let goal: Goal;
		if (y !== undefined) {
			goal = range <= 0 ? new GoalExact(targetVec) : new GoalNear(targetVec, range);
			this.currentGoalDesc = `(${x}, ${y}, ${z})`;
		} else {
			goal = range > 1 ? new GoalXZNear(targetVec, range) : new GoalXZ(targetVec);
			this.currentGoalDesc = `(${x}, ${z})`;
		}

		try {
			bot.ashfinder.goto(goal).then((res: { status: string; error?: unknown }) => {
				if (res && res.status === "failed") {
					this.main.client.logger.warn(`[SmartPathfinder] Navigation finished with failure: ${res.error || "unreachable"}`);
					this.onNavigationComplete(false);
				} else {
					this.onNavigationComplete(true);
				}
			}).catch((err: unknown) => {
				this.main.client.logger.error(`[SmartPathfinder] Ashfinder goto error: ${err}`);
				this.onNavigationComplete(false);
			});
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
	public followPlayer(username: string, range: number = 3, commandUser?: string): boolean {
		const bot = this.main.bot;
		if (!bot || !bot.ashfinder) return false;

		const target = bot.players[username]?.entity;
		if (!target) return false;

		this.initMovements();

		// Stop any active navigation before setting follow goal
		try {
			bot.ashfinder.stop();
		} catch {}

		this.commandUser = commandUser;
		this.main.antiAfkService?.pause();
		this.isNavigating = true;
		this.currentGoalDesc = `Follow ${username}`;

		try {
			const goal = new GoalNear(target.position, range);
			bot.ashfinder.gotoSmart(goal, { waypointThreshold: 40 }).then((res: { status: string; error?: unknown }) => {
				if (res && res.status === "failed") {
					this.onNavigationComplete(false);
				} else {
					this.onNavigationComplete(true);
				}
			}).catch((err: unknown) => {
				this.main.client.logger.error(`[SmartPathfinder] Follow error: ${err}`);
				this.onNavigationComplete(false);
			});
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
			if (bot.ashfinder) {
				try {
					bot.ashfinder.stop();
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
	public async navigateToLobbyNpc(x: number = 48.5, y: number = 10, z: number = 40.5): Promise<boolean> {
		const bot = this.main.bot;
		if (!bot || !bot.ashfinder) return false;

		const targetVec = new Vec3(x, y, z);
		const goalNear = new GoalNear(targetVec, 2);

		if (this.isNavigatingToLobbyNpc) {
			this.main.client.logger.info(`[Lobby] Lobby NPC navigation refreshed. Target: (${x}, ${y}, ${z})`);
			try {
				bot.ashfinder.stop();
				bot.ashfinder.goto(goalNear).catch(() => {});
			} catch {}
			return true;
		}

		this.isNavigatingToLobbyNpc = true;
		this.clearLobbyNpcTimer();

		// Configure lobby movements (no fall damage in lobby, maxFallDist = 256)
		const ash = bot.ashfinder;
		if (ash.config) {
			ash.config.parkour = true;
			ash.config.breakBlocks = false;
			ash.config.placeBlocks = false;
			ash.config.maxFallDist = 256; // No fall damage in lobby
			ash.config.swimming = true;
		}

		try {
			ash.stop();
		} catch {}

		this.main.antiAfkService?.pause();
		this.isNavigating = true;
		this.currentGoalDesc = `Lobby NPC (${x}, ${y}, ${z})`;

		const currentPos = bot.entity?.position;
		const posStr = currentPos ? `(${currentPos.x.toFixed(1)}, ${currentPos.y.toFixed(1)}, ${currentPos.z.toFixed(1)})` : "unknown";
		this.main.client.logger.info(
			`[Lobby] Navigating to NPC at (${x}, ${y}, ${z}) with zero fall damage limit... Current pos: ${posStr}`
		);

		try {
			ash.goto(goalNear).catch((err: unknown) => {
				this.main.client.logger.warn(`[Lobby] GoalNear error: ${err}`);
			});
		} catch (err) {
			this.main.client.logger.warn(`[Lobby] Ashfinder goto failed: ${err}`);
		}

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
				this.main.bot.ashfinder?.stop();
				try {
					this.main.bot.clearControlStates();
				} catch {}
				this.initMovements();
				return;
			}

			const pos = this.main.bot.entity.position;
			const dist = pos.distanceTo(targetVec);

			// Within interaction distance
			if (dist <= 4.0) {
				try {
					bot.clearControlStates();
				} catch {}

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
				logWalkTicks++;
				if (logWalkTicks % 3 === 0) {
					this.main.client.logger.info(
						`[Lobby] Walking to NPC (${x}, ${y}, ${z}) - Current: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) - Dist: ${dist.toFixed(1)}m`
					);
				}

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
				} catch {}

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
			} catch {}

			// 2. Quét và log toàn bộ các thực thể xung quanh (bán kính 6 block) để debug
			const allNearby = Object.values(bot.entities).filter((e: Entity | undefined): e is Entity => {
				if (!e || e === bot.entity) return false;
				return bot.entity.position.distanceTo(e.position) <= 6.0;
			});

			this.main.client.logger.info(
				`[Lobby] --- Quét thực thể xung quanh (${allNearby.length} entities gần bot) ---`
			);
			for (const e of allNearby) {
				const customEntity = e as Entity & { customName?: string; displayName?: string; username?: string };
				const name = customEntity.customName || customEntity.displayName || customEntity.username || e.name || "unnamed";
				const dist = bot.entity.position.distanceTo(e.position).toFixed(2);
				this.main.client.logger.info(
					`[Lobby Entity] ID: ${e.id} | Type: ${e.type} (${e.name}) | Name: "${name}" | Pos: (${e.position.x.toFixed(2)}, ${e.position.y.toFixed(2)}, ${e.position.z.toFixed(2)}) | Dist: ${dist}m`
				);
			}

			// Tọa độ NPC đích: 48.814, 10, 40.392
			const exactNpcPos = new Vec3(48.814, 10, 40.392);

			// 3. Lọc bỏ item_frame, item, arrow và tìm thực thể gần tọa độ (48.814, 10, 40.392) nhất
			const validEntities = allNearby.filter((e) => {
				if (!e || e === bot.entity) return false;
				const type = (e.type || "").toLowerCase();
				const name = (e.name || "").toLowerCase();
				if (type.includes("item_frame") || name.includes("item_frame")) return false;
				if (type === "item" || name === "item") return false;
				if (type === "arrow" || name === "arrow") return false;
				return e.position.distanceTo(exactNpcPos) <= 4.0 || bot.entity.position.distanceTo(e.position) <= 4.0;
			});

			// Sắp xếp theo khoảng cách gần nhất tới (48.814, 10, 40.392), ưu tiên Player/Living
			validEntities.sort((a, b) => {
				const customA = a as Entity & { username?: string };
				const customB = b as Entity & { username?: string };
				const isPlayerA = a.type === "player" || a.name === "player" || customA.username ? 1 : 0;
				const isPlayerB = b.type === "player" || b.name === "player" || customB.username ? 1 : 0;
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
				await bot.lookAt(targetEntity.position.offset(0, 1.2, 0), true).catch(() => {});

				// Chuột phải (activateEntity)
				try {
					await bot.activateEntity(targetEntity);
				} catch {}

				// Chuột trái (attack)
				try {
					bot.attack(targetEntity);
				} catch {}

				// Dùng vật phẩm trên tay (useOn)
				try {
					const botWithUseOn = bot as Bot & { useOn?: (entity: Entity) => void };
					botWithUseOn.useOn?.(targetEntity);
				} catch {}

				bot.swingArm("right");
			} else {
				// User facing: 59.7° yaw, -16.4° pitch (Minecraft F3)
				const targetFacingYaw = (-59.7 * Math.PI) / 180;
				const targetFacingPitch = (-16.4 * Math.PI) / 180;

				this.main.client.logger.info(
					`[Lobby] Looking at NPC target coords (${exactNpcPos.x}, ${exactNpcPos.y + 1.2}, ${exactNpcPos.z}) (attempt #${attemptNum})...`
				);
				await bot.look(targetFacingYaw, targetFacingPitch, true).catch(() => {});
				bot.swingArm("right");
			}

			// Kích hoạt vật phẩm trên tay (slot 3)
			try {
				bot.activateItem();
			} catch {}
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
		if (!bot || !bot.ashfinder) return;

		try {
			bot.ashfinder.stop();
		} catch {}

		const isFinal = this.waypointQueue.length === 0;
		const targetVec = new Vec3(nextWp.x, nextWp.y, nextWp.z);
		const goal = isFinal ? new GoalNear(targetVec, 1) : new GoalNear(targetVec, 3);

		try {
			bot.ashfinder.goto(goal).catch((err: unknown) => {
				this.main.client.logger.error(`[SmartPathfinder] Waypoint error: ${err}`);
				this.onNavigationComplete(false);
			});
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
