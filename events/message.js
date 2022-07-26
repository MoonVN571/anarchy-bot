const client = require('../discord').client;
const { notFoundPlayers, manager } = require('../set');
const { log } = require('../functions/utils');

client.on('messageCreate', message => {
    if (message.author.bot || !message.content.startsWith(client.config.prefix)) return;

    const args = message.content.slice(client.config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = client.commands.get(cmdName)
        || client.commands.find(cmd => cmd.aliases?.includes(cmdName));

    if (!cmd) return;
    if (cmd.dev && manager.adminBot.indexOf(message.author.id) < 0) return;
    if (cmd.admin && !message.member.permissions.has('Administrator')) return;

    if (cmd.disable) return;

    if (!message.guild.members.me.permissionsIn(message.channel).has('SendMessages')) return;

    /*
    if (cmd.categories == 'players') {
        let db = await setup.findOne({ guildId: message.guildId });
        if (!db?.commands) return;
    }*/

    message.sendMessage = sendMessage;
    message.notFoundPlayers = notFoundPlayers;
    message.prefix = client.config.prefix;

    log(message.guild.name + ' - ' + message.author.tag + ' used command: ' + cmdName + ' ' + args.join(" "));

    function sendMessage(embed) {
        if (typeof embed == 'object') message.reply({ embed, allowedMentions: { repliedUser: false } }).catch(err => { });
        else message.reply({ content: embed, allowedMentions: { repliedUser: false } }).catch(err => { });
    }

    cmd.execute(client, message, args);
});