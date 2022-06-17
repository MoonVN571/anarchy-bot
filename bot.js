const client = require('./index').discord;
const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
require('dotenv').config();

const settings = {
    botName: 'mo0nbot2',
    dev: false
}

function createBot() {
    const bot = m.createBot({
        host: '2y2c.oopsmc.net',
        port: 25565,
        username: settings.botName,
        version: '1.16.5'
    });

    bot.commands = new Collection();

    readdirSync('./igCommands').forEach(cmdName => {
        bot.commands.set(cmdName.split(".")[0], require('./igCommands/'+cmdName));
    });

    bot.prefix = '!';
    bot.chatChannel = '986599157068361734';
    bot.client = client;
    bot.adminName = ['MoonX', 'MoonVN'];
    bot.settings = settings;

    bot.notFoundPlayers = 'Không tìm thấy người chơi này.';

    bot.exited = false;
    bot.logged = false;
    bot.uptime = null;

    // Join Leave
    bot.countPlayers = 0;

    readdirSync('./igEvents').forEach(eventName => {
        let event = require('./igEvents/'+eventName);
        if (event.other && event.once) {
            bot._client.once(event.name, (...args) => event.execute(bot, ...args));
        } else if (event.other && !event.once) {
            bot._client.on(event.name, (...args) => event.execute(bot, ...args));
        } else {
            if (event.once) {
                bot.once(event.name, (...args) => event.execute(bot, ...args));
            } else {
                bot.on(event.name, (...args) => event.execute(bot, ...args));
            }
        }
    });

    client.on('messageCreate', message => {
        if(bot.exited||message.channel.type == 'DM'||!message.guild||!message.channel.isText()||message.author.bot) return;
        if(message.channel.id == bot.chatChannel) {        
            let content = message.content.trim().split(/ +/g);
            
            content = content.join(" ") + ".";
            if(!content.endsWith(".")) content = content.join(" ");

            content = content.charAt(0).toUpperCase() + content.slice(1);

            if(message.author.username.includes("§") || content.includes("§")) return;
            message.react('<a:1505_yes:797268802680258590>');
            if(content !== "") bot.chat(`[${message.author.tag}] ${content}`);
        }
    });
}

module.exports = { createBot, settings };