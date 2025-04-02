export enum Server {
	Main, Queue,
}

export enum DisconnectType {
	NPC = "npc",
}

export enum ServerIp {
	twoYtwoC = "2y2c.org",
	viAnarchy = "vianarchy.net",
	anarchyVN = "2y2c.org",
	_2A2BOrg = "2a2b.org",
	MCVui = "mcvui.net",
}

export interface ServerInfo {
	ip: ServerIp;
	auth: "microsoft" | "offline";
	version: string;
	livechat: string;
}

export interface MineflayerOptions {
	dev?: boolean;
	username: string;
	password: string;
	auth: "mojang" | "microsoft" | "offline";
	authme: string;
	pin: string[];
	serverInfo: ServerInfo;
	reconnectInterval: number;
	livechat: {
		channelId?: string;
		chat: string;
		autoMessage: {
			enabled: boolean;
			interval: number;
			msgs: string[];
		},
		rateLimitFlags: {
			enabled: boolean;
			time: number;
			minimumEmbeds: number;
			windowSize: number;
			burstInterval: number;
			burstThreshold: number;
			messageThreshold: number;
		},
		topic: {
			enabled: boolean,
			interval: number;
		}
	};
}

export enum MineflayerEvent {
	Spawn = "spawn",
	WindowOpen = "windowOpen",
	End = "end",
	Kicked = "kicked",
	MessageStr = "messagestr",
}