const mineflayer = require('mineflayer');
const { Colors } = require('discord.js');
const { readdirSync } = require('fs');
const client = require('./index');
const settings = require('./data');
const { log } = require('./functions/utils');
require('dotenv').config();
let config = {
    serverIp: '5a5b.ddns.net',
    serverName: '5A5B',
    serverVerion: '1.16.5',
    username: client.config.dev ? 'mo0nbot6' : 'mo0nbot2',
    emoji: '<a:1505_yes:797268802680258590>',
    dev: client.config.dev
}
let channel = {
    livechat: client.config.dev ? "987204059838709780" : "1040238922367782923",
    server: client.config.dev ? "987204092113879040" : "1040238994593693696"
}
function createBot() {
    const bot = mineflayer.createBot({
        host: config.serverIp,
        port: 25565,
        username: config.username,
        version: config.serverVerion
    });
    bot.adminName = settings.manager.adminGame;
    bot.notFoundPlayers = settings.notFoundPlayers;
    bot.config = config;
    bot.data = {
        arrayMessages: [],
        mainServer: false,
        logged: false,
        nextCheckTab: true,
        fastReconnect: false,
        spawnCount: 0,
        countPlayers: 0,
        uptime: 0
    }
    readdirSync('./events').forEach(eventName => {
        let event = require('./events/' + eventName);
        if (event.other && event.once) bot._client.once(event.name, (...args) => event.execute(bot, ...args));
        if (event.other && !event.once) bot._client.on(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && event.once) bot.once(event.name, (...args) => event.execute(bot, ...args));
        if (!event.other && !event.once) bot.on(event.name, (...args) => event.execute(bot, ...args));
    });
    client.on('messageCreate', message => {
        if (!bot.data.logged || message.author.bot) return;
        if (message.channel.id == channel.livechat) {
            let content = message.content;
            if (!message.author.bot && message.content.startsWith(config.discordPrefix))
                return; //runCommand(message);
            if (content.split('\n').length > 1) content = content.split('\n')[0];
            let toServer = `[${message.author.tag}] ${content}`;
            log(`[${config.serverName}] ${toServer}`);
            bot.chat(`${toServer}`);
            message.react(config.emoji);
        }
    });
}
function runCommand(message) {
    const args = message.content.slice(config.discordPrefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = client.commands.get(cmdName)
        || client.commands.find(cmd => cmd.aliases?.includes(cmdName));
    if (!cmd) return;
    message.sendMessage = sendMessage;
    message.notFoundPlayers = settings.notFoundPlayers;
    message.config = config;
    log('[' + config.serverName + '] - ' + message.author.tag + ' used command: ' + message.content);
    function sendMessage(embed) {
        if (typeof embed == 'object') message.reply({
            embed,
            allowedMentions: { repliedUser: false }
        });
        else message.reply({
            embeds: [{
                description: embed, color: Colors.NotQuiteBlack
            }], allowedMentions: { repliedUser: false }
        });
    }
    cmd.execute(client, message, args);
}
module.exports = { createBot, channel, config };
