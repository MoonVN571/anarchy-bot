const { ButtonBuilder } = require("@discordjs/builders");
const { ButtonStyle, ActionRowBuilder, Colors } = require("discord.js");
const { sendBotLog, getUptime } = require("../functions/minecraft");
const { getCoords, getPlayersList, getPlayer, getCountPlayersAPI } = require('../functions/minecraft/mcUtils');
const { getDorHMS } = require("../functions/utils");
const { manager } = require("../set");
const globalChannel = require("../bot").channel;
const client = require('../discord').client;

module.exports = {
    name: 'spawn',
    once: false,

    async execute(bot) {
        bot.data.spawnCount++;

        if (bot.data.spawnCount == 1) {
            sendBotLog('join', `Bot đã kết nối đến server!`);
            bot.data.logged = true;

            if ((await getCountPlayersAPI()) < 100) bot.data.spawnCount += 2;

            let channel = client.channels.cache.get(globalChannel.stats);

            await channel.messages.fetch().then(message => {
                let botMessage = message.map(m => m).filter(m => m.author.id == client.user.id);

                botMessage.forEach(message => {
                    message.delete().catch(err => { });
                });
            });

            let button = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('botinfo')
                        .setLabel("Update")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('playerlist')
                        .setLabel("Players")
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('kill')
                        .setLabel('Suicide')
                        .setStyle(ButtonStyle.Danger)
                );

            let embed = await getEmbed();

            channel.send({
                embeds: [embed],
                components: [button]
            }).then(async msg => {
                let collection = msg.channel.createMessageComponentCollector();

                collection.on('collect', async interaction => {
                    if (!bot.data.logged) return await interaction.reply({ content: "Bot chưa kết nối vào server thử lại sau!", ephemeral: true });

                    if (interaction.customId == 'botinfo') {
                        let embed = await getEmbed();
                        msg.edit({ embeds: [embed] });
                    }

                    if (interaction.customId == 'playerlist') {
                        if (bot.data.spawnCount < 4) return await interaction.reply({ content: "Bot đang ở hàng chờ thử lại sau!", ephemeral: true });

                        return await interaction.reply({
                            content: `\`\`\`${formatList(bot, getPlayersList(bot).sort()).join("")}\`\`\``,
                            ephemeral: true
                        });
                    }

                    if (interaction.customId == 'kill') {
                        if (manager.adminBot.indexOf(interaction.user.id) < 0) return await interaction.reply({ content: "Mơ đi con ko xài được đâu :))", ephemeral: true });

                        bot.chat('/kill');
                    }

                    await interaction.deferUpdate();
                });
            });

            function formatList(bot, list) {
                let arr = [];
                for (let i = 0; i < list.length; i++) {
                    let username = list[i];
                    if (!username) return;
                    let player = getPlayer(bot, username);
                    arr.push(`${i + 1 < 10 ? "0" + (i + 1) : i + 1}. ${username} [${player.ping}ms]` + "\n");
                }

                return arr;
            }

            async function getEmbed(interaction) {
                let coords = getCoords(bot);
                let players = getPlayersList(bot);

                if (!bot.data.logged) bot.data.spawnCount = 0;

                let server = "Unknown";
                if (bot.data.spawnCount == 1) server = "Auth";
                if (bot.data.spawnCount == 2 || bot.data.spawnCount == 3) server = "Queue";
                if (bot.data.spawnCount >= 4) server = "Main";

                let fields = [
                    {
                        name: "Server",
                        value: server,
                        inline: true
                    }
                ];

                let getPlayerAPI = await getCountPlayersAPI();
                let queue = getPlayerAPI - players.length;
                if (queue < 0) queue = 0;

                if (server == "Main") fields.push({
                    name: 'Uptime',
                    value: getUptime(bot) || "Unknown",
                    inline: true
                }, {
                    name: "Position",
                    value: `${coords.x} ${coords.y} ${coords.z}`,
                    inline: true
                }, {
                    name: "Online",
                    value: players.length + " players",
                    inline: true
                }, {
                    name: "Queue",
                    value: queue,
                    inline: true
                }, {
                    name: "TPS",
                    value: bot.data.tps ? bot.data.tps + " (now)" : "Null",
                    inline: true
                });

                return {
                    title: "BOT Statistics",
                    fields: fields,
                    color: Colors.Blue,
                    footer: {
                        text: interaction ? 'Yêu cầu bởi ' + interaction.user.tag : "Bấm vào nút Update dể cập nhật thông tin!",
                    },
                    timestamp: new Date().toISOString()
                };
            }
        }

        if (bot.data.spawnCount == 2) {
            bot.data.queueStart = Date.now();
        }

        if (bot.data.spawnCount == 3) {
            bot.data.uptime = Date.now();
            sendBotLog('queue', 'Đã đợi ' + getDorHMS((Date.now() - bot.data.queueStart) / 1000, true, true) + " trước khi vào server");
        }

        if (bot.data.spawnCount >= 4 || bot.player?.gamemode !== 0) bot.data.mainServer = true;
    }
}
