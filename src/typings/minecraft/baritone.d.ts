import "mineflayer";

declare module "@miner-org/mineflayer-baritone" {
	import { Bot } from "mineflayer";

	export function loader(bot: Bot): void;

	export interface Goal {
		heuristic?(node: any): number;
		isEnd?(node: any): boolean;
		hasChanged?(): boolean;
	}

	export namespace goals {
		export class GoalNear implements Goal {
			constructor(x: number, y: number, z: number, range: number);
			constructor(pos: any, range: number);
		}

		export class GoalExact implements Goal {
			constructor(x: number, y: number, z: number);
			constructor(pos: any);
		}

		export class GoalXZ implements Goal {
			constructor(x: number, z: number);
			constructor(pos: any);
		}

		export class GoalXZNear implements Goal {
			constructor(x: number, z: number, range: number);
			constructor(pos: any, range: number);
		}
	}
}

declare module "mineflayer" {
	interface Bot {
		ashfinder?: any;
	}
}
