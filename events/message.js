const { Permissions } = require('discord.js');
const client = require('../discord').client;
const { notFoundPlayers, manager } = require('../set');
const { log } = require('../functions/utils');
const setup = require('../db/setup');

client.on('messageCreate', message => {
    if (message.author.bot || !message.content.startsWith(client.config.prefix) || message.author == client.user || message.channel.type == "DM" || !message.channel) return;

    const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.commands.get(cmdName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName));

    if (!cmd) return;

    if (cmd.dev && manager.adminBot.indexOf(message.author.id) < 0) return;
    if (cmd.admin && !message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return;
    if (cmd.disable) return;

    if (!message.guild.me.permissions.has(Permissions.FLAGS.SEND_MESSAGES) || !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.SEND_MESSAGES)) return;

    /*
    if (cmd.categories == 'players') {
        let db = await setup.findOne({ guildId: message.guildId });
        if (!db?.commands) return;
    }*/

    message.sendMessage = sendMessage;
    message.notFoundPlayers = notFoundPlayers;
    message.prefix = client.config.prefix;

    log(message.author.tag + ' was used command: ' + cmdName + ' ' + args.join(" "));

    function sendMessage(embed) {
        if (typeof embed == 'object') message.reply({ embed, allowedMentions: { repliedUser: false } }).catch(err => { });
        else message.reply({ content: embed, allowedMentions: { repliedUser: false } }).catch(err => { });
    }

    cmd.execute(client, message, args);
});