const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
const main = require('./discord');
const index = require('./index');
const set = require('./set');
require('dotenv').config();

let config = {
    botName: index.config.dev ? 'mo0nbot4' : 'mo0nbot3',
    dev: index.config.dev,
    minecraftPrefix: index.config.dev ? "!!" : "!",
    debug: index.config.debug
}

let channel = {
    webhookLivechat: config.dev ? "995568425613152358" : "996999311135080466",
    webhookJoinMessage: config.dev ? "995585131123331112" : "995585131123331112",
    webhookJoin: config.dev ? "995585063582453862" : "996999642912931952",
    webhookServer: config.dev ? "995585187889037312" : "996800472981712969",
    chat: config.dev ? "987204059838709780" : "986599157068361734",
    commands: config.dev ? "990104136018182154" : "987889094845689916"
}
function createBot() {
    const bot = m.createBot({
        host: '2b2c.org',
        port: 25565,
        username: config.botName,
        version: '1.12.2'
    });

    // Chạm được nè
    bot.adminName = ['MoonX', 'MoonVN', bot.username];
    bot.notFoundPlayers = set.notFoundPlayers;

    // đừng đụng zô
    bot.client = main.client;
    bot.config = config;

    bot.arrayMessages = [];

    bot.mainServer = false;
    bot.logged = false;
    bot.nextCheckTab = true;
    bot.uptime = 0;
    bot.queueTime = 0;

    // Join Leave
    bot.countPlayers = 0;

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
        if (!bot.logged || message.channel.type == 'DM' || !message.guild || !message.channel.isText() || message.author.bot) return;
        if (message.channel.id == channel.commands) bot.chat(message.content);
        if (message.channel.id == channel.chat) {
            let content = message.content;

            if (message.author.username.includes("§") || content.includes("§")) return;
            if(content.split('\n').length > 1) content = content.split('\n')[0];

            message.react('<a:1505_yes:797268802680258590>');
            bot.chat(`[${message.author.tag}] ${content}`);
        }
    });
}

module.exports = { createBot, channel, config };
