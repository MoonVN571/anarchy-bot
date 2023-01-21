const { getPlayersList, getQueue } = require("../functions/mcUtils");
const playtime = require('../../databases/playtime');
const server = require("../../databases/server");
module.exports = {
    name: 'playerlist_header',
    other: true,
    async execute(bot, data) {
        const cleanArray = (str) => {
            str = str.replace(/\u00A7[0-9A-FK-OR]|-/ig, '')
                .split("\n")
                .filter(str => str || str.trim() || str !== "\n");
            return str;
        }
        const header = cleanArray(JSON.parse(data.header)?.text);
        const footer = cleanArray(JSON.parse(data.footer)?.text);
        if (!bot.data.mainServer || !header) return;
        if (!bot.data.checkPlaytime) {
            setTimeout(() => bot.data.checkPlaytime = false, 2 * 60 * 1000);
            bot.data.checkPlaytime = true;
            let players = getPlayersList(bot);
            players.forEach(async username => {
                let ptData = await playtime.findOne({ username: username });
                if (!ptData) return playtime.create({ username: username, time: 2 * 60 * 1000 });
                ptData.time += 2 * 60 * 1000;
                await ptData.save();
            });
        }
        if (!bot.data.checkInfo) {
            setTimeout(() => bot.data.checkInfo = true, 1 * 60 * 1000);
            bot.data.checkInfo = false;
            const { tps, players, ping } = await getInfo();
            const queue = getQueue();
            const data = await server.findOne({});
            if (!data && tps) {
                await server.create({ last_updated: Date.now(), tps: tps, players: players, ping: ping });
            } else if (tps) {
                data['last_updated'] = Date.now();
                data['tps'] = tps;
                data['players'] = players;
                data['ping'] = ping;
                data['queue'] = queue;
                data.save();
            }
        }
        let serverData = getInfo();
        bot.data.tps = serverData.tps;
        function getInfo() {
            let content = footer[1]?.trim();
            if (!content) return { tps: 0, ping: 0, players: 1 };
            let tps = content.split(' tps')[0];
            let players = +content.split(' players')[0].split('    ')[1];
            let ping = +content.split(' ping')[0].split('    ')[2];
            if (tps == 'Perfect') tps = 20;
            else if (tps) tps = +tps;
            return {
                tps: tps,
                players: players,
                ping: ping
            }
        }
        if (!bot.data.nextCheckTab) {
            setTimeout(() => bot.data.nextCheckTab = false, 10 * 60 * 1000);
            bot.data.nextCheckTab = true;
            const completeStr = footer[1] +
                `\nJoined <t:${parseInt(bot.data.uptime / 1000)}:R>, last updated <t:${parseInt(Date.now() / 1000)}:R>`
                + '\n' + header.join("\n") + " \n" + footer.join("\n");
            if (bot.data.mainServer)
                bot.client.channels.cache.get(bot.channel.livechat).setTopic(completeStr);
        }
    }
}
