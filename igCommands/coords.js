module.exports = {
    name: 'coords',
    aliases: ['coordinate', 'xyz'],
    execute(bot,username,args) {
        bot.sendMessage('whisper', parseInt(bot.entity.position.x) + " " + parseInt(bot.entity.position.y) + " " + parseInt(bot.entity.position.z));
    }
}