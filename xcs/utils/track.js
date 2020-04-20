const https = require('https')
var pjson = require('../package.json');
const track = function(event) {
    if (!event || typeof event != 'object') return;
    event.rel = pjson.version;
    event.app = pjson.name || process.env.APP_NAME;
    const keyvals = Object.keys(event).map(function (key) { return `${key}=${encodeURIComponent(event[key] + '')}`; });
    if (keyvals.length == 0) return;
    const url = new URL(`${process.env.TRACK_URL}?${keyvals.join("&")}`);
    https.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'GET',
        rejectUnauthorized : false,
        checkServerIdentity: function(host, cert) {
          return undefined;
        }
    }).end();
}

module.exports = track