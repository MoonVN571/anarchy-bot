const main = require('./index');
const m = require('mineflayer');
const { Collection } = require('discord.js');
const { readdirSync } = require('fs');
require('dotenv').config();

let config = {
    botName: main.config.dev ? 'mo0nbot2' : 'mo0nbot',
    dev: main.config.dev,
    minecraftPrefix: main.config.dev ? "!!" : "!",
    debug: true
}

let channel = {
    chat: config.dev ? "987204059838709780" : "986599157068361734",
    log: config.dev ? "987204075164692551" : "986601542981410816",
    join: config.dev ? "987204116839284756" : "986601627588894720",
    server: config.dev ? "987204092113879040" : "986807303565086781",
    commands: config.dev ? "990104136018182154" : "987889094845689916"
}

function createBot() {
    const bot = m.createBot({
        host: '2y2c.org',
        port: 25565,
        username: config.dev ? config.botName : process.env.MAIL,
        password: config.dev ? null : process.env.PASS,
        auth: config.dev ? null : 'microsoft',
        version: '1.18.1'
    });

    // Chạm được nè
    bot.adminName = ['MoonX', 'MoonVN', bot.username];
    bot.notFoundPlayers = 'Không tìm thấy người chơi này.';

    // đừng đụng zô
    bot.client = main.client;
    bot.config = config;

    bot.arrayMessages = [];

    bot.mainServer = false;
    bot.exited = false;
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
        if (bot.logged || message.channel.type == 'DM' || !message.guild || !message.channel.isText() || message.author.bot) return;
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

module.exports = { createBot, config, channel };
