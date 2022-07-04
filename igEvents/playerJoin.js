const { sendCustomMessage } = require('../functions/minecraft');
const seen = require('../db/seen');
const jd = require('../db/joindate');

module.exports = {
    name: 'playerJoined',

    async execute (bot, player) {
        // fix spam khi join
        bot.countPlayers++;

        let jdData = await jd.findOne({username:player.username});
        if(!jdData) await jd.create({username:player.username,time:Date.now()});
        
        let seenData = await seen.findOne({username:player.username});
        if(!seenData) await seen.create({username:player.username,time:Date.now()});
        else {
            seenData.time = Date.now();
            seenData.save();
        }

        if (bot.countPlayers <= Object.values(bot.players).map(p => p.username).length) return;

        sendCustomMessage('connect', player.username + ' đã tham gia vào server.');
    }
}