const pt = require('../db/playtime');
const { getPlayersList } = require('../functions/minecraft/mcUtils');
const { messageArray } = require('../data');
const { setStatus } = require('../functions/botFunc');

module.exports = {
    name: 'login',
    once: true,

    execute(bot) {
        console.log("Đã kết nối vào server!");

        bot.data.uptime = Date.now();
        setStatus('idle', 'Watching', 'chờ kết nối!');

        /*
        setInterval(() => {
            if (!bot.data.logged && !bot.data.mainServer) return;

            let randomMsg = messageArray[Math.floor(Math.random() * messageArray.length)];
            bot.chat('> ' + randomMsg);
        }, 3 * 60 * 1000);
        */

        if (bot.config.dev) return;

        setInterval(async () => {
            if (!bot.data.logged && !bot.data.mainServer) return;

            let players = getPlayersList(bot);

            players.forEach(async username => {
                let ptData = await pt.findOne({ username: username });
                if (!ptData) return pt.create({ username: username, time: 2 * 60 * 1000 });
                ptData.time += 2 * 60 * 1000;
                ptData.save();
            });
        }, 2 * 60 * 1000);
    }
}

