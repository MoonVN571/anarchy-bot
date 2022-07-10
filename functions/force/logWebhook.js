require('dotenv').config();
module.exports = (str) => {
    require('../botFunc').createWebhook({ url: process.env.WEBHOOK_LOGS_URL }, str);
}