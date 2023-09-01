export enum Server {
    Main, Queue,
}

export enum DisconnectType {
    NPC = "npc",
}

export enum ServerIp {
    twoYtwoC = "2y2c.org",
    viAnarchy = "vianarchy.net",
    anarchyVN = "anarchyvn.net",
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