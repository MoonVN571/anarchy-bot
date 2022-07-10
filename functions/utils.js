const config = require('../bot').config;
require('dotenv').config();

/**
 * 
 * @param {Number} value Number từ 0-9
 * @param {Number} length Số số 0 VD: 1 return về 01
 * @returns String
 */
function legitNumber(value, length) {
    return `${value}`.padStart(length, 0);
}
/**
 * 
 * @param {Number} temp Thời gian tính theo giây
 * @param {Boolean} vi HMS hoặc giờ phút giây
 * @param {Boolean} fulltime DHMS hoặc ngày giờ phút giây
 * @returns String
 */
function getDorHMS(temp, vi, fulltime) {

    let days = parseInt(temp / 86400),
        hours = parseInt(((temp - days * 86400) / 3600)),
        minutes = parseInt(((temp - days * 86400 - hours * 3600)) / 60),
        seconds = parseInt(temp % 60);

    log(days, hours, minutes, seconds);

    let format = '';
    let str = ['h', 'm', 's', 'd'];
    if (vi) str = [' giờ', ' phút', ' giây', ' ngày'];
    if (hours > 0) format = hours + str[0] + " ";
    if (minutes > 0) format = format + minutes + str[1] + " ";
    if (seconds > 0) format = format + seconds + str[2];

    if (fulltime && days > 0) format = days + str[3] + " " + format;
    if (!fulltime & days > 0) return days + str[3];
    return format.trim()
}

/**
 * 
 * @param {String} string 
 */
function log(...string) {
    if (!config.debug) return;
    let timeFormat = '[' +
    new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_minh' })
    + ' ' + new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_minh' }) + ']';
    console.log(timeFormat + " " + string.join(" "));
    //require('./force/logWebhook')(timeFormat + " " + string.join(' '));
}

module.exports = {
    legitNumber,
    getDorHMS,
    log
}
