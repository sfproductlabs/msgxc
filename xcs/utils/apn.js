var apn = require('apn');

var apnProvider = new apn.Provider({
    token: {
        key: process.env.APPLE_KEY_PUSH,
        keyId: process.env.APPLE_KEY_PUSH_ID,
        teamId: process.env.APPLE_TEAM_ID
    },
    production: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging'
});


class APN {

    static async send(to, msg, options = {}) {
        
            var note = new apn.Notification();

            note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
            note.badge = 1;
            note.sound = options.sound || "ping.aiff";
            note.alert = msg;
            note.payload = options.data || options.payload || {};
            note.topic = process.env.APPLE_BUNDLE_ID;

            return await apnProvider.send(note, to);

    }
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = APN;