import EndEvent from "./End";
import ErrorEvent from "./Error";
import KickedEvent from "./Kicked";
import MessageStrEvent from "./MessageStr";
import SpawnEvent from "./Spawn";
import WindowOpenEvent from "./WindowOpen";
import { MineflayerEvent } from "../../typings/MineflayerEvent";

export const mineflayerEventClasses: (new () => MineflayerEvent)[] = [
	EndEvent,
	ErrorEvent,
	KickedEvent,
	MessageStrEvent,
	SpawnEvent,
	WindowOpenEvent,
];

export {
	EndEvent,
	ErrorEvent,
	KickedEvent,
	MessageStrEvent,
	SpawnEvent,
	WindowOpenEvent,
};
