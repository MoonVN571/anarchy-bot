import { Minecraft } from "./structures";

export enum Server {
    Main, Queue,
}

export enum DisconnectType {
    NPC = "npc",
}

export enum ServerIp {
    twoYtwoC = "2y2c.org",
    viAnarchy = "vianarchy.net",
    anarchyVN = "vinamc.net",
    _2A2BOrg = "2a2b.org",
    MCVui = "mcvui.net",
}

export interface DefaultOptions {
    prefix: "!";
    developers: string[];
    dev: boolean;
    guildId: string;
    emojis: { tick: string };
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
    serverInfo?: ServerInfo;
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
            keepCountTime: number;
            flaggedCount: number;
            minimumEmbeds: number;
        },
        topic: {
            enabled: boolean,
            interval: number;
        }
    };
}

export interface MEvent {
    execute?: (main: Minecraft, ...param) => void;
    data?: {
        once: boolean;
        name: MineflayerEvent;
    };
}

export enum MineflayerEvent {
    Spawn = "spawn",
    WindowOpen = "windowOpen",
    End = "end",
    Kicked = "kicked",
    MessageStr = "messagestr",
}