const client = require('../index').client;
const { Permissions } = require('discord.js');

client.on('messageCreate',message=>{
    if (message.author.bot || !message.content.startsWith(client.config.prefix) || message.author == client.user || message.channel.type == "DM" || !message.channel) return;

    const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.commands.get(cmdName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(cmdName));

    if (!cmd) return;
    if (cmd.admin && message.author.id !== "425599739837284362") return;
    if(!message.guild.me.permissions.has(Permissions.FLAGS.SEND_MESSAGES) || !message.guild.me.permissionsIn(message.channel).has(Permissions.FLAGS.SEND_MESSAGES)) return;
    
    if (cmd.admin && !message.member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) return;

    message.sendMessage = sendMessage;

    function sendMessage(embed) {
        if(typeof embed == 'object') mesasge.reply({embed, allowedMentions: { repliedUser: false }});
        else message.reply({content:embed, allowedMentions: { repliedUser: false }});
    }

    try {
        cmd.execute(client, message, args);
    } catch (err) {
        console.log(cmdName);
        console.log(err);
    }
});