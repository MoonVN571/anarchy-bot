const { getWebhook } = require('../botFunc');
const index = require('../../index');
require('dotenv').config();
module.exports = async (str) => {
    let webhook = await getWebhook(index.config.devGuild, index.logger.logs );
    require('../botFunc').createWebhook({ url: webhook.url }, str);
}