module.exports = {
    name: 'eval',
    dev: true,
    async executeIngame(bot, username, args) {
        try {
            let e = await eval(args.join(" "));
            bot.sendMessage('whisper', 'Result: ' + e + '.');
        } catch (e) {
            bot.sendMessage('whisper', 'Error: ' + e.message + '.');
        }
    }
}