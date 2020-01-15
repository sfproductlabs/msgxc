const crypto = require('crypto')

//Tracker hash
function tHash(raw) {
    if (raw) {
        let hash = crypto.createHash('sha1').update((process.env.TRACKING_PRIVATE_SALT || '') + raw).digest(encoding = 'base64');
        //https://www.npmjs.com/package/urlsafe-base64
        //'+' is encoded as '-' and '/' is encoded as '_'. 
        // The padding character '=' is removed. DID NOT IMPLEMENT THIS AS INCOMPATIBLE
        hash = hash.replace(/\+/g, "-");
        hash = hash.replace(/\//g, "_");
        return hash;
    } else {
        return null;
    }
}


module.exports = {
    tHash
}