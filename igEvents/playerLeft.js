const { sendCustomMessage } = require('../functions/minecraft');
const seen = require('../db/seen');
module.exports = {
    name: 'playerLeft',
    execute (bot, player) {

        let seenData = await seen.findOne({username:player.username});
        if(!seenData) await seen.create({username:player.username,time:Date.now()});
        else {
            seenData.time = Date.now();
            seenData.save();
        }

        sendCustomMessage('connect', player.username + ' đã thoát khỏi server.');
    }
}