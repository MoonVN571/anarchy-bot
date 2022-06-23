const { sendGlobalChat } = require('../functions/minecraft');
module.exports = {
    name: 'message',
    timeout: 3000,
    execute (bot, msg) {
        let content = msg.toString();

        let username = '';
        if(content.startsWith('<')) username = content.slice(1).split("> ")[0];
        if(username.startsWith('[Donator] ')) username = username.split('[Donator] ')[1];

        let userMessage = '';
        if(content.startsWith("<")) userMessage = content.split(" ").slice(1).join(" ");
        if(!content.split(' ')[0].endsWith(">")) userMessage = content.split(" ").slice(2).join(" ");

        sendGlobalChat(bot, content, username, userMessage);

        if(!userMessage.startsWith(bot.prefix)) return;

        let args = userMessage.trim().slice(bot.prefix.length).split(/ +/g);
        let cmdName = args.shift().toLowerCase();
        
        const cmd = bot.commands.get(cmdName) || bot.commands.find(cmd=>cmd.aliases.includes(cmdName));

        if(!cmd) return;

        bot.sendMessage = sendMessage;
        function sendMessage (type, message) {
            // console.log(message);
            // TODO
            if(type == 'whisper') return bot.chat(`/msg ${username} ${message}`);
            if(!message) return bot.chat(type); // message instead
        }

        if(cmd.admin){
            if(bot.adminName.indexOf(username) > -1) cmd.execute(bot, username, args);
            else return;
        }

        cmd.execute(bot, username, args);
    }
}
