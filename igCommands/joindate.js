const { Bot } = require('mineflayer');
const jd = require('../db/joindate');
const { getDorHMS, legitNumber } = require('../functions/utils');

module.exports = {
    name: 'joindate',
    aliases: ['jd', 'date'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;
        

        let mapData = (await jd.find()).filter(data=>data.username.toLowerCase()==name);
        let jdData = mapData[0];
        
        if(!jdData) return bot.sendMessage('whisper', bot.notFoundPlayers);
        
        let date = new Date(jdData.time)

        bot.sendMessage('whisper', name+' : '
        + legitNumber(date.getDate(),2)
        + '.' + legitNumber(date.getMonth()+1,2)
        + '.' + date.getFullYear() + ' - '
        + legitNumber(getDorHMS((Date.now()-jdData.time)/1000, true))
        + ' trước');
    }
}