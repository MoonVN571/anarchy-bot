const { sendBotLog, sendGlobalChat } = require('../functions/minecraft');
const pt = require('../db/playtime');

module.exports = {
    name: 'login',
    once: true,
    execute (bot) {
        console.log("Đã tham gia server");
    
        bot.logged = true;
        bot.exited = false;
        bot.uptime = Date.now();

        setInterval(() => {
            bot.chat("ANTI AFK > " + Math.floor(Math.random() * 10000000000));
        }, 60 * 1000);

        setInterval(async() => {
            if(bot.logged) {
                let players = Object.values(bot.players).map(p => p.username);
                players.forEach(async username => {
                    let ptData = await pt.findOne({username:username});
                    if(!ptData) return pt.create({username:username,time:2*60*1000});
                    ptData.time += 2 * 60 * 1000;
                    ptData.save();
                });
            }
        }, 2 * 60 * 1000);

        sendBotLog('join', `Bot đang vào server..`);

        sendGlobalChat('☘️ Đang vào server.. ☘️','','');
    }
}

