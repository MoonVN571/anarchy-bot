const { sendGlobalChat } = require('../functions/minecraft');
module.exports = {
    name: 'message',
    execute (bot, msg) {
        let content = msg.toString().replace("[DM]  ").toString();

        let username = '';
        if(content.startsWith('<')) username = content.slice(1).split("> ")[0];

        let userMessage = '';
        if(content.startsWith("<")) userMessage = content.split(" ").slice(1).join(" ");

        sendGlobalChat(bot, content, username, userMessage);

        if(!userMessage.startsWith(bot.prefix)) return;

        let args = userMessage.trim().slice(bot.prefix.length).split(/ +/g);
        let cmdName = args.shift().toLowerCase();
        
        const cmd = bot.commands.get(cmdName) || bot.commands.find(cmd=>cmd.aliases.includes(cmdName));

        if(!cmd) return;

        if(cmd.admin){
            if(bot.adminName.indexOf(username) > -1) cmd.execute(bot, username, args);
            else return;
        }

        bot.sendMessage = sendMessage;
        function sendMessage (type, message) {
            // console.log(message);
            // TODO
            if(type == 'whisper') return bot.chat(`/msg ${username} ${message}`);
            if(!message) return bot.chat(type); // message instead
        }

        cmd.execute(bot, username, args);
    }
}
