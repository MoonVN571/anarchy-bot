const { getCoords } = require('../functions/minecraft/mcUtils');
module.exports = {
    name: 'coords',
    aliases: ['coordinate', 'xyz'],
    executeIngame(bot, username, args) {
        let coords = getCoords(bot);
        bot.sendMessage('whisper', `X: ${coords.x} / ${coords.y} / ${coords.z}`);
    }
}