import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { ChatPriority } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";
import { messageColors } from "../../utils";

export class KillCommand extends Command {
	private static lastKillTimes: Map<string, number> = new Map();
	private readonly COOLDOWN_MS = 60000; // 60s global cooldown

	constructor() {
		super({
			name: "kill",
			aliases: ["suicide", "die", "tusan"],
			description: "Yêu cầu bot tự sát (/kill) để giải cứu khi bị kẹt bẫy và hồi sinh về Spawn",
			usage: ">kill",
			inGameUsage: "!kill",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, bot, serverHost, client } = ctx;

		if (!bot.bot || !bot.joined) {
			await message.reply({ content: "Bot hiện chưa kết nối vào server Minecraft!" });
			return;
		}

		const isDeveloper = client.config.developers?.includes(message.author.id);
		const lastUsed = KillCommand.lastKillTimes.get(serverHost) || 0;
		const now = Date.now();
		const remaining = Math.ceil((this.COOLDOWN_MS - (now - lastUsed)) / 1000);

		if (!isDeveloper && remaining > 0) {
			await message.reply({
				content: `Lệnh \`>kill\` đang trong thời gian hồi chiêu. Vui lòng thử lại sau **${remaining}s**!`,
			});
			return;
		}

		KillCommand.lastKillTimes.set(serverHost, now);

		try {
			bot.chatQueue.send("/kill", ChatPriority.HIGH);
			const container = new ContainerBuilder()
				.setAccentColor(messageColors.dead)
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(
						`**Lệnh Tự Sát Đã Được Thực Thi**\n\n` +
						`- **Server:** \`${serverHost}\`\n` +
						`- **Người yêu cầu:** <@${message.author.id}>\n` +
						`- **Hành động:** Bot đã gửi lệnh \`/kill\` in-game để giải cứu và hồi sinh về Spawn.`
					)
				)
				.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
				.addTextDisplayComponents(
					new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:F>`)
				);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (err) {
			await message.reply({ content: `Không thể gửi lệnh /kill: ${err}` });
		}
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const { bot, sender, serverHost } = ctx;

		if (!bot.bot || !bot.joined) {
			return "[Tự sát] Bot chưa kết nối hoàn toàn vào máy chủ!";
		}

		const lastUsed = KillCommand.lastKillTimes.get(serverHost) || 0;
		const now = Date.now();
		const remaining = Math.ceil((this.COOLDOWN_MS - (now - lastUsed)) / 1000);

		if (remaining > 0) {
			return `[Tự sát] Lệnh đang hồi chiêu (${remaining}s), vui lòng đợi!`;
		}

		KillCommand.lastKillTimes.set(serverHost, now);

		try {
			bot.chatQueue.send("/kill", ChatPriority.HIGH);
			return `[Tự sát] Bot đã tự sát theo yêu cầu của ${sender} và đang hồi sinh về Spawn!`;
		} catch {
			return "[Tự sát] Không thể thực thi lệnh /kill lúc này!";
		}
	}
}

