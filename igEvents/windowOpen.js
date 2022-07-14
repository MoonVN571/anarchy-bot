require('dotenv').config();
module.exports = {
    name: 'windowOpen',
    async execute(bot, window) {
        window.requiresConfirmation = false;

        // Credit to vaitosoi
        if (window.slots.length == 63) return bot.clickWindow(13, 0, 0);
    }
}