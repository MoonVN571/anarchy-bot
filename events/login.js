const players = require('../databases/players');
const { getPlayersList } = require('../functions/minecraft/mcUtils');
module.exports = {
    name: 'spawn',
    once: true,
    execute(bot) {
        console.log("Đã kết nối vào server!");
        bot.data.uptime = Date.now();
        if (bot.config.dev) return;
        setInterval(async () => {
            if (!bot.data.logged && !bot.data.mainServer) return;
            let playerList = getPlayersList(bot);
            playerList.forEach(async username => {
                let data = await players.findOne({ username: username });
                if (!data) data = await players.create({ username: username });
                data.playtime += 2 * 60 * 1000;
                data.save();
            });
        }, 2 * 60 * 1000);
    }
}

