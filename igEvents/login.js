const pt = require('../db/playtime');

module.exports = {
    name: 'login',
    once: true,
    execute (bot) {
        console.log("Đã kết nối vào server!");
        
        bot.exited = false;
        bot.uptime = Date.now();

        setInterval(() => {
            let players = Object.values(bot.players).map(p => p.username);
            let username = players[Math.floor(Math.random()*players.length)-1];
            
            if(username) bot.whisper(username, 'Hi');
            else bot.chat('Hi everyone! [' + Math.floor(Math.random()*99+10) + ']');
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

