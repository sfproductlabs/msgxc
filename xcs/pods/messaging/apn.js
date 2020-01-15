var apn = require('apn');

var options = {
    token: {
        key: process.env.APPLE_KEY_PUSH,
        keyId: process.env.APPLE_KEY_PUSH_ID,
        teamId: process.env.APPLE_TEAM_ID
    },
    production: false
};

var apnProvider = new apn.Provider(options);

let deviceToken = "ad62ea6ea23d6974871cf59a06cbdb2783b85adbafe3355c0007362249d3e75c"

var note = new apn.Notification();

note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
note.badge = 3;
note.sound = "ping.aiff";
note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
note.payload = {
    'messageFrom': 'John Appleseed'
};
note.topic = process.env.APPLE_BUNDLE_ID;

apnProvider.send(note, deviceToken).then((result) => {
    // see documentation for an explanation of result
    console.log(result)
});