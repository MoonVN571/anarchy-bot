const pt = require('../db/playtime');

module.exports = {
    name: 'login',
    once: true,
    execute (bot) {
        console.log("Đã kết nối vào server!");
        
        bot.exited = false;
        bot.uptime = Date.now();

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

        setInterval(async() => {
            if(!bot.config.dev && bot.logged && bot.mainServer) {
                let players = Object.values(bot.players).map(p => p.username);

                players.forEach(async username => {
                    let ptData = await pt.findOne({username:username});
                    if(!ptData) return pt.create({username:username,time:2*60*1000});
                    ptData.time += 2 * 60 * 1000;
                    ptData.save();
                });
            }
        }, 2 * 60 * 1000);
    }
}

