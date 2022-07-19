const { getUptime, sendGlobalChat } = require("../functions/minecraft");
const { setStatus } = require('../functions/botFunc');
const { log } = require("../functions/utils");
const { getCountPlayersAPI, getPlayersList } = require('../functions/minecraft/mcUtils');

let minutes = 1;

module.exports = {
    name: 'playerlist_header',
    other: true,

    async execute(bot, data) {

        let parsedHeader = JSON.parse(data.header);
        let parsedFooter = JSON.parse(data.footer);

        let cleanArray = (str) => {
            if (!str) return;
            str = str.replace(/\u00A7[0-9A-FK-OR]|-/ig, '')
                .split("\n")
                .filter(str => str || str.trim() || str !== "\n");
            return str;
        }

        let header = cleanArray(parsedHeader?.text);
        let footer = cleanArray(parsedFooter?.text);

        if (!header) return;

        let tps = footer[1]?.split(" ")[0];
        bot.data.tps = tps;

        if (bot.data.nextCheckTab) {
            setTimeout(() => bot.data.nextCheckTab = true, minutes * 60 * 1000);
            bot.data.nextCheckTab = false;

            // BOT STATUS MAIN SERVER TAB
            let completeStr = footer[1] +
                "\n- Đã vào server từ " + getUptime(bot) +
                " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");

            if (bot.data.mainServer) bot.client.channels.cache.get(require("../bot").channel.chat).setTopic(completeStr);

            let getPlayersAPI = await getCountPlayersAPI();
            let queue = getPlayersAPI - getPlayersList(bot).length;
            if (queue < 0) queue = 0;

            let est = header[4].trim() + ' -' + header[5];
            let parseBotQ = header[4].trim().split(" ");
            let botQ = parseBotQ[parseBotQ.length - 1];

            if (!bot.data.mainServer) {
                if (botQ == 'None') botQ = 1;
                if (queue == 0) queue = 1;
                let stt = 'trong hàng chờ: ' + botQ + '/' + queue;

                // log(est);
                sendGlobalChat(bot, est);
                setStatus('idle', 'Playing', stt);
            } else {
                minutes = 5;

                // log('tps: '+ tps);
                setStatus('online', 'Playing', 'TPS: ' + tps + ' - Hàng Chờ: ' + queue);
            }
        }
    }
}
