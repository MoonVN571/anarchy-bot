const { getCoords } = require('../functions/minecraft/mcUtils');

module.exports = {
    name: 'coords',
    description: 'Xem toạ độ của bot',
    aliases: ['coordinate', 'xyz'],

    execute(bot, username, args) {
        let coords = getCoords(bot);
        bot.sendMessage('whisper', `X: ${coords.x} / ${coords.y} / ${coords.z}`);
    }
}