const { Client, Message } = require('discord.js');
const kd = require('../../db/stats');

module.exports = {
    name: 'stats',
    description: 'Xem KD của player',
    aliases: ['kd'],
    categories: 'players',

    /**
     * 
     * @param {Client} bot 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(bot, message, args) {
        let name = args[0] || 'mo0nbot';

        let mapData = (await kd.find()).filter(data => data.username.toLowerCase() == name.toLowerCase());
        let kdData = mapData[0];

        let kills = kdData?.kills || 0;
        let deaths = kdData?.deaths || 0;
        let kda = kills / deaths || 0.00;

        message.sendMessage('**' + name + '** - K: ' + kills + " - D: " + deaths + " - K/D: " + kda.toFixed(2));
    }
}
