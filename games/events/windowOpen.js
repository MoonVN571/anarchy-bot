require('dotenv').config();
module.exports = {
    name: 'windowOpen',
    async execute(bot, window) {
        const settings = bot.setting.advancedLogin;
        window.requiresConfirmation = false;
        if (window.slots.length == settings.slotInvClick) return bot.clickWindow(settings.slotClick, 0, 0);
        const pin = process.env.PIN.split("");
        await bot.clickWindow(pin[0], 0, 0);
        await bot.clickWindow(pin[1], 0, 0);
        await bot.clickWindow(pin[2], 0, 0);
        await bot.clickWindow(pin[3], 0, 0);
    }
}