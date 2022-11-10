const { client } = require('../index');
module.exports.legitNumber = (value, length) => {
    return `${value}`.padStart(length, 0);
}
module.exports.getDorHMS = (temp, onlyDays) => {
    let days = parseInt(temp / 86400),
        hours = parseInt(((temp - days * 86400) / 3600)),
        minutes = parseInt(((temp - days * 86400 - hours * 3600)) / 60),
        seconds = parseInt(temp % 60);
    timeArray = [days, hours, minutes, seconds];
    if (!format) format = ['d ', 'h ', 'm ', 's '];
    let str = "";
    for (let i = 0; i < 4; i++) {
        let def = `${timeArray[i]}${format[i]}`;
        if (better && timeArray[i] > 0) str += def
        else if (!better) str += def;
    }
    if (onlyDays && days > 0) str = `${days}${format[0]}`;
    return str.trim();
}
module.exports.log = (...string) => {
    let timeFormat =
        '['
        + new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_minh' })
        + ' '
        + new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_minh' }) +
        ']';

    console.log(timeFormat + " " + string.join(" "));
    client.channels.cache.get('995305343456382976').send(timeFormat + " " + string.join(' '));
}
module.exports.sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}