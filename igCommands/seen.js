const { Bot } = require('mineflayer');
const seen = require('../db/seen');
const {  } = require('../functions/minecraft');
const { getDorHMS, legitNumber } = require('../functions/utils');

module.exports = {
    name: 'seen',
    aliases: ['see', 'lastseen', 'ls'],

    /**
     * 
     * @param {Bot} bot 
     * @param {String} username 
     * @param {String[]} args 
     */
    async execute(bot, username, args) {
        let name = args[0] || username;


        let mapData = (await seen.find()).filter(data=>data.username.toLowerCase()==name);
        let seenData = mapData[0];
        
        if(!seenData) return bot.sendMessage('whisper', bot.notFoundPlayers);
        
        let date = new Date(seenData.time);

        bot.sendMessage('whisper', name+' : '
        + legitNumber(date.getDate(),2)
        + '.' + legitNumber(date.getMonth()+1,2)
        + '.' + date.getFullYear() + ' - '
        + legitNumber(getDorHMS((Date.now()-seenData.time)/1000, true))
        + ' trước');
    }
}