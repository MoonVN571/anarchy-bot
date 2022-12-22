const { getPlayersList } = require("../functions/minecraft/mcUtils");
const playtime = require('../db/playtime');
module.exports = {
    name: 'playerlist_header',
    other: true,
    async execute(bot, data) {
        const parsedHeader = JSON.parse(data.header);
        const parsedFooter = JSON.parse(data.footer);
        const cleanArray = (str) => {
            if (!str) return;
            str = str.replace(/\u00A7[0-9A-FK-OR]|-/ig, '')
                .split("\n")
                .filter(str => str || str.trim() || str !== "\n");
            return str;
        }
        const header = cleanArray(parsedHeader?.text);
        const footer = cleanArray(parsedFooter?.text);
        if (!header) return;
        if (bot.data.checkPlaytime) {
            setTimeout(() => bot.data.checkPlaytime = true, 2 * 60 * 1000);
            bot.data.checkPlaytime = false;
            if (bot.data.logged && bot.data.mainServer) {
                let players = getPlayersList(bot);
                players.forEach(async username => {
                    let ptData = await playtime.findOne({ username: username });
                    if (!ptData) return playtime.create({ username: username, time: 2 * 60 * 1000 });
                    ptData.time += 2 * 60 * 1000;
                    ptData.save();
                });
            }
        }
        if (bot.data.nextCheckTab) {
            setTimeout(() => bot.data.nextCheckTab = true, 10 * 60 * 1000);
            bot.data.nextCheckTab = false;
            const completeStr = footer[1] +
                `\nJoined <t:${parseInt(bot.data.uptime / 1000)}:R>, last updated <t:${parseInt(Date.now() / 1000)}:R>`
                + header.join("\n") + " \n" + footer.join("\n");
            if (bot.data.mainServer)
                bot.client.channels.cache.get(require("../bot").channel.livechat).setTopic(completeStr);
        }
    }
}
