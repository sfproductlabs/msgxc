const webpush = require('web-push');

if (process.env.GOOGLE_FIREBASE_API_KEY) webpush.setGCMAPIKey(process.env.GOOGLE_FIREBASE_API_KEY);
const setup = process.env.PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY && process.env.WEB_PUSH_EMAIL;
if (setup) {
    webpush.setVapidDetails(`mailto:${process.env.WEB_PUSH_EMAIL}`, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);
}


class WPN {
    static async send(subscription, payload) {
        if (setup) {
            if (typeof subscription === 'string') {
                try {
                    subscription = JSON.parse(subscription)
                } catch {}
            } 
            if (typeof payload === 'object') {
                try {
                    payload = JSON.stringify(payload)
                } catch {}
            } 
            return new Promise(function (resolve, reject) {
                webpush.sendNotification(subscription, payload)
                .then(result => {
                    resolve(result);
                })
                .catch(error => {
                    //console.error(error.stack);
                    reject(error);
                });
                
            });
        }
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = WPN;