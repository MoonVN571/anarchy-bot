const { Client, Message } = require('discord.js');

const { getDorHMS, legitNumber } = require('../../functions/utils');

const jd = require('../../db/joindate');

module.exports = {
    name: 'joindate',
    description: 'Xem ngày player lần đầu vào server',
    aliases: ['jd', 'date'],
    categories: 'players',

    /**
     * 
     * @param {Client} client 
     * @param {Message} message 
     * @param {String[]} args 
     */
    async execute(client, message, args) {
        let name = args[0] || 'mo0nbot';

        let mapData = (await jd.find()).filter(data => data.username.toLowerCase() == name.toLowerCase());
        let jdData = mapData[0];

        if (!jdData) return message.sendMessage(message.notFoundPlayers);

        let date = new Date(jdData.time)

        message.sendMessage('**' +name + '** đã tham gia server vào '
            + legitNumber(date.getDate(), 2) + '.' + legitNumber(date.getMonth() + 1, 2) + '.' + date.getFullYear()
            + ' (' + legitNumber(getDorHMS((Date.now() - jdData.time) / 1000, true)) + ' trước)');
    }
}
