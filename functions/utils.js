const client = require('../index').discord;
require('dotenv').config();
function getDorHMS(temp, fulltime) {
    let days = parseInt(temp / 86400),
        hours = parseInt(((temp - days * 86400) / 3600)),
        minutes = parseInt(((temp - days * 86400 - hours * 3600)) / 60),
        seconds = parseInt(temp % 60);
    let format = '';
    let str = [' giờ', ' phút', ' giây', ' ngày'];
    if (hours > 0) format = hours + str[0] + " ";
    if (minutes > 0) format = format + minutes + str[1] + " ";
    if (seconds > 0) format = format + seconds + str[2];

    if (fulltime && days > 0) format = days + str[3] + " " + format;
    if (!fulltime & days > 0) return days + str[3];
    return format.trim();
}
function log(...string) {
    let timeFormat =
        `[${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_minh' })}]`;
    const msg = `${timeFormat} ${string.join(' ')}`;
    console.log(msg);
    if (!client.dev) client.channels.cache.get(client.config.channel.logs).send(msg);
}
module.exports = {
    getDorHMS,
    log
}
