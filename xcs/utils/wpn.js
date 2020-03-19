const webpush = require('web-push');
if (process.env.GOOGLE_FIREBASE_API_KEY) webpush.setGCMAPIKey(process.env.GOOGLE_FIREBASE_API_KEY);
webpush.setVapidDetails(`mailto:${process.env.WEB_PUSH_EMAIL}`, process.env.PUBLIC_VAPID_KEY, process.env.PRIVATE_VAPID_KEY);

class WPN {
    static async send(subscription, payload) {
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
        return await new Promise(function (resolve, reject) {
            webpush.sendNotification(subscription, payload)
            .then(result => {
                resolve(true);
            })
            .catch(error => {
                //console.error(error.stack);
                resolve(false);
            });
            
        });
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = WPN;