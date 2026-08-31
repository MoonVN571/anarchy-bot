import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	MessageFlags,
} from "discord.js";
import { Command, CommandContext, InGameCommandContext } from "../typings/Command";
import { messageColors } from "../utils/chatParser";

export class DiscordInviteCommand extends Command {
	private readonly defaultInviteUrl: string = "http://bit.ly/mo0nbot2";

	constructor() {
		super({
			name: "discord",
			aliases: ["dc", "invite", "server"],
			description: "Lấy liên kết tham gia máy chủ Discord của Bot",
			usage: ">discord",
			inGameUsage: "!discord",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message } = ctx;
		const inviteUrl = process.env.DISCORD_INVITE_URL || this.defaultInviteUrl;

		const container = new ContainerBuilder()
			.setAccentColor(messageColors.botChat)
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`**Máy Chủ Discord Chính Thức**\n\n` +
					`Tham gia cộng đồng Discord để nhận thông báo, tra cứu thống kê và kết nối cùng người chơi:\n` +
					`🔗 **Liên kết mời:** ${inviteUrl}`
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
	}

	public async executeInGame(_ctx: InGameCommandContext): Promise<string | void> {
		const inviteUrl = process.env.DISCORD_INVITE_URL || this.defaultInviteUrl;
		return `[Discord] Tham gia Discord Server của Bot tại: ${inviteUrl}`;
	}
}
