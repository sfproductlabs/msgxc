const {
    ab2str
} = require('./strings')

const CLIENT_HEADERS = [
    'x-client-ip',
    'x-forwarded-for',
    'x-real-ip',
    'x-cluster-client-ip',
    'x-forwarded',
    'forwarded-for',
    'fowarded'
]

const str2ip = function(str) {
    const ips = (str || '').replace(/\s+/g,'').split(',');
    if (ips[0].length > 0)
        return ips[0];
    else 
        return null;
}

const ab2ip6 = function(ab) {
    try {
        return ab2str(ab, 'hex').match(/.{1,4}/g).join(":")
    } catch (ex) {
        console.warn(ex);
        return null;
    }
}

const req2ip = function(comms) {
    try {
        let ip = null;

        CLIENT_HEADERS.some( ( header ) => {
            ip = comms.headers[header];
            return !!ip;
        } );
    
        if ( !ip ) {
            //TODO Get IP from request
        }    

        return ip;
    } catch (ex) {
        console.warn(ex);
        return null;
    }
}



module.exports =  {
    ab2ip6,
    str2ip,
    req2ip
}