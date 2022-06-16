const {readdir}  =require('fs');
const { sendCustomMessage } = require('../functions/minecraft');
module.exports = {
    name: 'playerLeft',
    execute (bot, player) {
        if (bot.countPlayers <= Object.values(bot.players).map(p => p.username).length) return;

        sendCustomMessage('connect', player.username + ' đã thoát khỏi server.');

        return;
        readdir('./oldfags', (err,data) => {
            if (err) throw err;
            if (data.toString().split("\r\n").indexOf(username) > -1) {
                sendCustomMessage('oldfag', player.username + ' đã thoát khỏi server.');
            }
        });
    }
}