const mineflayer = require('mineflayer');
const { Colors } = require('discord.js');
const { readdirSync } = require('fs');
const client = require('./index').discord;
const setting = require('./setting');
const { log } = require('./functions/utils');
require('dotenv').config();
const channel = {
    livechat: setting.channel.livechat[!client.dev ? 'main' : 'dev'],
    server: setting.channel.server[!client.dev ? 'main' : 'dev']
};
function createBot() {
    const bot = mineflayer.createBot({
        host: 'anarchyvn.net',
        port: 25565,
        username: setting.botName[!client.dev ? 'main' : 'dev'],
        version: '1.16.5'
    });
    bot.notFoundPlayers = setting.notFoundPlayers;
    bot.client = client;
    bot.dev = client.dev;
    bot.setting = setting;
    bot.data = {
        arrayMessages: [],
        mainServer: false,
        logged: false,
        nextCheckTab: true,
        checkPlaytime: true,
        fastReconnect: false,
        spawnCount: 0,
        countPlayers: 0,
        uptime: 0,
        deathList: []
    };
    readdirSync('./gameEvents').forEach(eventName => {
        const event = require('./gameEvents/' + eventName);
        if (event.other && event.once) bot._client.once(event.name, (...args) => event.execute(bot, ...args));
        if (event.other && !event.once) bot._client.on(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && event.once) bot.once(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && !event.once) bot.on(event.name, (...args) => event.execute(bot, ...args));
    });
    client.on('messageCreate', message => {
        if (!bot.data.logged || message.author.bot) return;
        if (message.channel.id == channel.server) bot.chat(message.content);
        if (message.channel.id == channel.livechat) {
            let content = message.content;
            if (!message.author.bot && message.content.startsWith(setting.botPrefix))
                return runCommand(message);
            if (message.author.username.includes('§') || content.includes('§')) return;
            if (content.split('\n').length > 1) content = content.split('\n')[0];
            let toServer = `[${message.author.tag}] ${content} | https://mo0nbot ga/invite`;
            log(toServer);
            message.react('<a:1505_yes:797268802680258590>');
            bot.chat(`${toServer}`);
        }
    });
}
function runCommand(message) {
    const args = message.content.slice(setting.botPrefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = client.commands.get(cmdName)
        || client.commands.find(cmd => cmd.aliases?.includes(cmdName));
    if (!cmd) return;
    if (cmd.dev && message.author.id !== setting.botOwner) return;
    client.sendMessage = (_, msg) => {
        message.channel.send({
            embeds: [{
                description: msg,
                color: Colors.Orange
            }], allowedMentions: { repliedUser: false }
        });
    }
    client.notFoundPlayers = setting.notFoundPlayers;
    log(`[ANARCHYVN-DISCORD] ${message.author.tag} : ${message.content}`);
    cmd.execute(client, message, args);
}
function callBot(tick) {
    setTimeout(() => createBot(), tick || 1);
}
module.exports = { callBot, channel };
