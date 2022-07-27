const { getUptime } = require("../functions/minecraft");

let minutes = 10;

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

        if (bot.data.nextCheckTab) {
            setTimeout(() => bot.data.nextCheckTab = true, minutes * 60 * 1000);
            bot.data.nextCheckTab = false;

            // BOT STATUS MAIN SERVER TAB
            let completeStr = footer[1] +
                "\n- Đã vào server từ " + getUptime(bot) +
                " trước" + "\n" + header.join("\n") + " \n" + footer.join("\n");

            if (bot.data.mainServer) bot.client.channels.cache.get(require("../bot").channel.livechat).setTopic(completeStr);
        }
    }
}
