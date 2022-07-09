module.exports = {
    name: 'coords',
    description: 'Xem toạ độ của bot',
    aliases: ['coordinate', 'xyz'],

    execute(bot, username, args) {
        bot.sendMessage('whisper', 'X: ' + parseInt(bot.entity.position.x)
        + " - Y: " + parseInt(bot.entity.position.y)
        + " - Z: " + parseInt(bot.entity.position.z));
    }
}