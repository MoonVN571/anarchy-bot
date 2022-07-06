const pt = require('../db/playtime');
const { autoMessage, messageArray } = require('../set');

module.exports = {
    name: 'login',
    once: true,
    execute (bot) {
        console.log("Đã kết nối vào server!");
        
        bot.exited = false;
        bot.uptime = Date.now();

        if(!bot.logged && !bot.mainServer) return;

        setInterval(() => {
            bot.setControlState('forward', true);
            setTimeout(() => {
                bot.setControlState('forward', false);
                bot.setControlState('back', true);
                setTimeout(() => {
                    bot.setControlState('back', false);
                    bot.setControlState('right', true);
                    setTimeout(() => {
                        bot.setControlState('right', false);
                        bot.setControlState('left', true);
                        setTimeout(() => {
                            bot.setControlState('left', false);
                            bot.clearControlStates();
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        }, 3 * 60 * 1000);

        setInterval(() => {
            // Lấy ngẫu nhiên 1 message trả về biến
            let randomMsg = messageArray[Math.floor(Math.random() * messageArray.length) - 1];
            bot.chat(randomMsg);
        }, 2 * 60 * 1000);

        if(bot.config.dev) return;
        
        setInterval(async() => {
                let players = Object.values(bot.players).map(p => p.username);

                players.forEach(async username => {
                    let ptData = await pt.findOne({username:username});
                    if(!ptData) return pt.create({username:username,time:2*60*1000});
                    ptData.time += 2 * 60 * 1000;
                    ptData.save();
                });
        }, 2 * 60 * 1000);
    }
}

