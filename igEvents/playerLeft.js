const { sendCustomMessage } = require('../functions/minecraft');
const seen = require('../db/seen');

module.exports = {
    name: 'playerLeft',
    
    async execute (bot, player) {
        if (bot.countPlayers <= Object.values(bot.players).map(p => p.username).length) return;
        if(!bot.mainServer) return;

        if(!bot.config.dev) {
            let seenData = await seen.findOne({username:player.username});
            if(!seenData) await seen.create({username:player.username,time:Date.now()});
            else {
                seenData.time = Date.now();
                seenData.save();
            }
        }
        
        sendCustomMessage('disconnect', player.username + ' đã thoát khỏi server.');
    }
}