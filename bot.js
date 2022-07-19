const m = require('mineflayer');
const { Collection, ChannelType } = require('discord.js');
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
    minecraftPrefix: index.config.dev ? "!!" : "!",
    debug: index.config.debug
}

let channel = {
    livechat: config.dev ? "987204059838709780" : "996797558993190922",
    join: config.dev ? "987204116839284756" : "987204116839284756",
    log: config.dev ? "995936735852769320" : "995936735852769320",
    server: config.dev ? "987204092113879040" : "996797600554565642",
    commands: config.dev ? "990104136018182154" : "996797865378709674",
    stats: config.dev ? "998406738011234346" : "998848503545606364"
}

function createBot() {
    const bot = m.createBot({
        host: '2b2c.org',
        port: 25565,
        username: config.botName,
        version: '1.12.2'
    });

    // Chạm được nè
    bot.adminName = manager.adminGame;
    bot.notFoundPlayers = set.notFoundPlayers;

    // đừng đụng zô
    bot.client = main.client;
    bot.config = config;

    bot.data = {
        arrayMessages: [],
        mainServer: false,
        logged: false,
        nextCheckTab: true,
        uptime: 0,
        queueTime: 0,
        spawnCount: 0,
        tps: null,
        countPlayers: 0
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
        if (message.channel.id == channel.commands) bot.chat(message.content);
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
