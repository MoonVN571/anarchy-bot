const { getUptime } = require("../functions/minecraft");
const { getPlayersList } = require("../functions/minecraft/mcUtils");
const pt = require('../db/playtime');
const { log } = require("../functions/utils");
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
                log(players.length, ' players playtime saved!');
                players.forEach(async username => {
                    let ptData = await pt.findOne({ username: username });
                    if (!ptData) return pt.create({ username: username, time: 2 * 60 * 1000 });
                    ptData.time += 2 * 60 * 1000;
                    ptData.save();
                });
            }
        }
        if (bot.data.nextCheckTab) {
            setTimeout(() => bot.data.nextCheckTab = true, minutes * 60 * 1000);
            bot.data.nextCheckTab = false;
            const completeStr = footer[1] +
                "\n- Đã vào server từ " + getUptime(bot) +
                " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");
            if (bot.data.mainServer)
                bot.client.channels.cache.get(require("../bot").channel.livechat).setTopic(completeStr);
        }
    }
}
