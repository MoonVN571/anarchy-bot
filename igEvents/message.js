const { sendGlobalChat } = require('../functions/minecraft');
const { log, solveAlotMessage } = require('../functions/utils');

module.exports = {
    name: 'message',

    /**
     * 
     * @param {} bot 
     * @param {String} msg 
     * @returns 
     */
    execute (bot, msg) {
        let content = msg.toString();

        let username;
        let message;

        log(content);

        if(content.startsWith('<')) {
            let parse = content;
            if(content.startsWith("<[")) parse = content.replace("[Donator] ", "")
            if(content.split("] ")[1]?.split(">")[0].startsWith("~")) parse = parse.replace("~","");
            parse = parse.replace("<", "").replace('>', '');
            username = parse.split(' ')[0];
            message = parse.split(' ').slice(1).join(" ");
            log(`${username} : ${message}`);
        }

        sendGlobalChat(bot, content, username, message);

        if(!username||!message) return;

        /**
         *        COMMAND
         */

        if(!message.startsWith(bot.config.minecraftPrefix)) return;

        let args = message.trim().toLowerCase().slice(bot.config.minecraftPrefix.length).split(/ +/g);
        let cmdName = args.shift();
        
        const cmd = bot.commands.get(cmdName) || bot.commands.find(cmd=>cmd.aliases?.indexOf(cmdName) > -1);

        if(!cmd) return;

        log(username + ' used command: ' + cmdName);

        bot.sendMessage = (type, message) => sendMessage(bot, type, message);
        function sendMessage(bot, type, message) {
            if(type == 'whisper') {
                bot.arrayMessages.push(`/msg ${username} ${message}`);
                solveAlotMessage(bot);
            }
        }

        if(cmd.admin && bot.adminName.indexOf(username) < 0) return;

        cmd.execute(bot, username, args);
    }
}
