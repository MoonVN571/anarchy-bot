import {
	ContainerBuilder,
	MessageFlags,
	SectionBuilder,
	SeparatorBuilder,
	TextDisplayBuilder,
	ThumbnailBuilder,
} from "discord.js";
import { QuoteService } from "../../services";
import { Command, CommandContext, InGameCommandContext } from "../../typings";

export class QuoteCommand extends Command {
	constructor() {
		super({
			name: "quote",
			aliases: ["q", "trichdan"],
			description: "Lấy ngẫu nhiên một câu trích dẫn bất hủ của người chơi",
			usage: ">quote [tên_người_chơi]",
			inGameUsage: "!quote [tên_người_chơi]",
		});
	}

	public async execute(ctx: CommandContext): Promise<void> {
		const { message, args, serverHost } = ctx;
		const targetUser = args[0];

		const quote = await QuoteService.getRandomQuote(serverHost, targetUser);

		if (!quote) {
			if (targetUser) {
				await message.reply({
					content: `Chưa có trích dẫn nào được ghi nhận cho người chơi **${targetUser}** trên server \`${serverHost}\`.`,
				});
			} else {
				await message.reply({
					content: `Chưa có trích dẫn nào được ghi nhận trên server \`${serverHost}\`.`,
				});
			}
			return;
		}

		const totalQuotes = await QuoteService.getQuotesCount(serverHost, quote.username);
		const username = quote.displayName || quote.username;
		const headUrl = `https://mc-heads.net/avatar/${quote.username}/64.png`;

		const section = new SectionBuilder()
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`**${username}**\n*“ ${quote.message} ”*`)
			)
			.setThumbnailAccessory(
				new ThumbnailBuilder().setURL(headUrl).setDescription(`Avatar of ${username}`)
			);

		const container = new ContainerBuilder()
			.setAccentColor(0xf1c40f)
			.addSectionComponents(section)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`Tổng Quotes của player: **${totalQuotes}**\n<t:${Math.floor(Date.now() / 1000)}:F>`)
			);

		await message.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2,
		});
	}

	public async executeInGame(ctx: InGameCommandContext): Promise<string | void> {
		const targetUser = ctx.args[0];
		const quote = await QuoteService.getRandomQuote(ctx.serverHost, targetUser);

		if (!quote) {
			return targetUser
				? `[Quote] Không tìm thấy trích dẫn nào của người chơi "${targetUser}".`
				: `[Quote] Chưa có trích dẫn nào được lưu trên server.`;
		}

		return `[Quote] <${quote.displayName || quote.username}>: "${quote.message}"`;
	}
}
