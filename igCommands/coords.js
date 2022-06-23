module.exports = {
    name: 'coords',
    aliases: ['coordinate', 'xyz'],
    execute(bot,username,args) {
        bot.sendMessage('whisper', parseInt(bot.entity.postion.x) + " " + parseInt(bot.entity.postion.y) + " " + parseInt(bot.entity.postion.z));
    }
}