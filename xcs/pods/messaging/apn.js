var apn = require('apn');

var options = {
    token: {
        key: "path/to/APNsAuthKey_XXXXXXXXXX.p8",
        keyId: "key-id",
        teamId: "developer-team-id"
    },
    production: false
};

var apnProvider = new apn.Provider(options);

let deviceToken = "babababa"

var note = new apn.Notification();

note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
note.badge = 3;
note.sound = "ping.aiff";
note.alert = "\uD83D\uDCE7 \u2709 You have a new message";
note.payload = {
    'messageFrom': 'John Appleseed'
};
note.topic = "<your-app-bundle-id>";

apnProvider.send(note, deviceToken).then((result) => {
    // see documentation for an explanation of result
});