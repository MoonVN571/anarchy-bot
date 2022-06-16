
function legitNumber (value, length) {
    return `${value}`.padStart(length, 0);
}

function getDorHMS(temp, vi){

    let days = parseInt(temp / 86400),
    hours = parseInt(((temp - days * 86400) / 3600)),
    minutes = parseInt(((temp - days * 86400 - hours * 3600)) / 60),
    seconds = parseInt(temp % 60);

    
    let format='';
    let str = ['h','m','s','d'];
    if(vi) str = [' giờ', ' phút', ' giây', ' ngày'];
    if(hours>0) format = hours+str[0] + " ";
    if(minutes>0) format = format+minutes+str[1] + " ";
    if(seconds>0) format = format+seconds+str[2];

    if(days>0) return days + str[3];
    return format.trim()
}


module.exports = {
    legitNumber,
    getDorHMS
}