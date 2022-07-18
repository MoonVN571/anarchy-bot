const pt = require('../db/playtime');
const { setStatus } = require('../functions/botFunc');
const { getPlayersList } = require('../functions/minecraft/mcUtils');
const { sleep } = require('../functions/utils');
const { messageArray } = require('../set');

module.exports = {
    name: 'login',
    once: true,

    execute(bot) {
        console.log("Đã kết nối vào server!");

        bot.data.uptime = Date.now();

        setInterval(async () => {
            /*
            bot.setControlState('forward', true);
            await sleep(1000);
            bot.setControlState('back', true);
            bot.setControlState('left', true);
            await sleep(1000);
            bot.setControlState('back', false);
            bot.setControlState('left', false);
            bot.setControlState('right', true);
            await sleep(1000);
            bot.setControlState('right', false);
            */
        }, 20 * 60 * 1000);


        setInterval(() => {
            if (!bot.data.logged && !bot.data.mainServer) return;

            let randomMsg = messageArray[Math.floor(Math.random() * messageArray.length)];
            bot.chat('> ' + randomMsg);
        }, 10 * 60 * 1000);

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

