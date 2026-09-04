import {
	MinecraftServerConfig,
	RateLimitConfig,
	LiveChatTopicConfig,
	AutoMessageConfig,
	AuthType,
	LobbyNpcConfig,
} from "../typings";
import { ServerIp } from "../typings";

export const DEV_MINECRAFT_USERNAMES: string[] = ["MoonVN", "Moonu"];

export function isDevMinecraftUser(username: string): boolean {
	if (!username) return false;
	const clean = username.toLowerCase().trim();
	return DEV_MINECRAFT_USERNAMES.some(dev => dev.toLowerCase().trim() === clean);
}

export const defaultRateLimitConfig: RateLimitConfig = {
	enabled: true,
	time: 2 * 60 * 1000,
	windowSize: 10 * 1000,
	messageThreshold: 10,
	burstThreshold: 5,
	burstInterval: 2 * 1000,
	minimumEmbeds: 5,
};

export const defaultTopicConfig: LiveChatTopicConfig = {
	enabled: true,
	interval: 5 * 1000 + 10 * 60 * 1000,
};

export const defaultAutoMessageConfig: AutoMessageConfig = {
	enabled: true,
	minMessages: 25,
	maxMessages: 50,
	minIntervalMs: 60 * 1000,
	mode: "sequential",
	messages: [
		"> [Server] Bây giờ là {real_time_vn} (VN) | In-game: {ingame_time} ({day_night}) - {weather}. {players_online} người online!",
		"> [Xổ Số 18:00] Mua vé số săn Hũ Jackpot với \"!xs buy <số_lượng>\". Quay thưởng tự động vào đúng 18:00 hàng ngày!",
		"> [Minigames] Thử vận may với \"!cf\" (Tung xu), \"!tx\" (Tài Xỉu), \"!bc\" (Bầu Cua) hoặc chăm chỉ cày cuốc với \"!work\"!",
		"> [Tân Thủ] Nhận ngay 500 xu khởi nghiệp miễn phí khi gõ \"!bal\" hoặc \"!work\" lần đầu tiên!",
		"> [Bảng Xếp Hạng] Xem top đại gia và cao thủ cày cuốc server bằng lệnh \"!top bal\", \"!top win\", \"!top play\"!",
		"> [Ghi Chú] Lưu tọa độ base và chia sẻ cho đồng đội an toàn với lệnh \"!note\" (tự động bảo mật tọa độ trên LiveChat)!",
		"> [Stalk] Nhận thông báo whisper khi bạn bè hoặc kẻ thù vào/ra server với lệnh \"!stalk <tên_player>\"!",
		"> [Thời Gian] Xem giờ game 24h, đếm ngược bao lâu nữa trời tối và chu kỳ mặt trăng bằng lệnh \"!time\"!",
		"> [Bot Tip] Dùng \"!help\" để xem danh sách toàn bộ các lệnh tiện ích và minigame của bot.",
		"> [Discord] Tham gia Discord để trò chuyện 2 chiều in-game & nhận thông báo tử nạn tại: bit.ly/mo0nbot2",
		"> [Bot Tip] Xem chỉ số K/D của bạn hoặc người chơi khác với lệnh \"!kd <tên>\" hoặc \"!stats <tên>\".",
		"> [Bot Tip] Tra cứu lần đầu và lần cuối người chơi xuất hiện trên server bằng lệnh \"!seen <tên>\" hoặc \"!joindate <tên>\".",
		"> [Bot Tip] Xem thời gian đã chơi của bạn trên server bằng lệnh \"!playtime <tên>\".",
		"> [Discord] Trò chuyện cùng mọi người trong server Minecraft ngay cả khi đang offline tại: bit.ly/mo0nbot2",
		"> [Bot Tip] Xem tọa độ và tình trạng bot hiện tại bằng lệnh \"!coords\" hoặc \"!status\".",
	],
};

export interface CreateServerConfigOptions {
	id?: string;
	name?: string;
	ip: ServerIp | string;
	port?: number;
	version?: string;
	auth?: AuthType;
	channelId: string;
	reconnectInterval?: number;
	autoNavigateCommand?: string;
	lobbyNpc?: LobbyNpcConfig;
	assumeMainServer?: boolean;
}

export function createServerConfig(options: CreateServerConfigOptions): MinecraftServerConfig {
	const authMode: AuthType = (options.auth || (process.env.AUTH_MODE as AuthType) || "offline");

	const defaultLobbyNpc: LobbyNpcConfig | undefined =
		options.lobbyNpc ||
		(options.ip === ServerIp.anarchyVN || options.ip === "2y2c.org" || options.id?.toLowerCase().includes("anarchyvn")
			? { enabled: true, x: 48, y: 10, z: 40 }
			: undefined);

	return {
		id: options.id || options.ip,
		name: options.name || options.ip,
		connection: {
			host: options.ip,
			port: options.port || 25565,
			version: options.version || "1.19.4",
			auth: authMode,
			username: authMode === "offline" ? (process.env.BOT_NAME || "mo0nbot") : undefined,
			microsoftEmail: process.env.MICROSOFT_EMAIL,
			microsoftPassword: process.env.MICROSOFT_PASSWORD,
			profilesFolder: "./.ms_cache",
		},
		auth: {
			authmePassword: process.env.AUTHME,
			pin: process.env.PIN ? process.env.PIN.split("") : undefined,
			autoNavigateCommand: options.autoNavigateCommand,
			lobbyNpc: defaultLobbyNpc,
			assumeMainServer: options.assumeMainServer,
		},
		livechat: {
			channelId: options.channelId,
			chatTemplate: "> [{displayName}] {message} | bit.ly/mo0nbot2",
			rateLimit: { ...defaultRateLimitConfig },
			topic: { ...defaultTopicConfig },
			autoMessage: { ...defaultAutoMessageConfig },
		},
		reconnectInterval:
			options.reconnectInterval ??
			(process.env.RECONNECT_INTERVAL_MS ? parseInt(process.env.RECONNECT_INTERVAL_MS, 10) : 10 * 1000),
	};
}
