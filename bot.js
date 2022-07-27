const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
const main = require('./discord');
const index = require('./index');
const set = require('./set');
const { manager } = require('./set');
const { log } = require('./functions/utils');
require('dotenv').config();

let config = {
    botName: index.config.dev ? 'mo0nbot4' : 'mo0nbot3',
    dev: index.config.dev,
    minecraftPrefix: index.config.dev ? "!!" : "!"
}

let channel = {
    livechat: config.dev ? "987204059838709780" : "1001826269664661616",
    server: config.dev ? "987204092113879040" : "1001838578399187055"
}

function createBot() {
    const bot = m.createBot({
        host: 'anarchyvn.net',
        port: 25565,
        username: config.botName,
        version: '1.12.2'
    });

    bot.adminName = manager.adminGame;
    bot.notFoundPlayers = set.notFoundPlayers;

    bot.client = main.client;
    bot.config = config;

    bot.data = {
        arrayMessages: [],
        mainServer: false,
        logged: false,
        nextCheckTab: true,
        spawnCount: 0,
        countPlayers: 0,
        uptime: 0
    }

    bot.commands = new Collection();
    readdirSync('./igCommands').forEach(cmdName => {
        bot.commands.set(cmdName.split(".")[0], require('./igCommands/' + cmdName));
    });

    readdirSync('./igEvents').forEach(eventName => {
        let event = require('./igEvents/' + eventName);

        if (event.other && event.once) bot._client.once(event.name, (...args) => event.execute(bot, ...args));
        if (event.other && !event.once) bot._client.on(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && event.once) bot.once(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && !event.once) bot.on(event.name, (...args) => event.execute(bot, ...args));
    });

    main.client.on('messageCreate', message => {
        if (!bot.data.logged || message.author.bot) return;
        if (message.channel.id == channel.livechat) {
            let content = message.content;

            if (message.author.username.includes("§") || content.includes("§")) return;
            if (content.split('\n').length > 1) content = content.split('\n')[0];

            let toServer = `[${message.author.tag}] ${content}`;
            log(toServer);
            
            message.react('<a:1505_yes:797268802680258590>');
            bot.chat(`${toServer}`);
        }
    });
}

module.exports = { createBot, channel, config };
