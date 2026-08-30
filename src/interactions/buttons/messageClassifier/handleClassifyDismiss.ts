import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { Discord } from "../../../structures";

export async function handleClassifyDismiss(_client: Discord, interaction: ButtonInteraction): Promise<void> {
	await interaction.deferUpdate();

	const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
		.setColor(0x808080)
		.setTitle("Đã Bỏ Qua Tin Nhắn")
		.setFooter({ text: `Đã bỏ qua bởi @${interaction.user.username}` });

	await interaction.editReply({
		embeds: [updatedEmbed],
		components: [],
	});
}
