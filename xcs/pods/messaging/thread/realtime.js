const { nats } = require('../../../utils/nats');
const { publishClients, broadcastServers } = require('../../realtime/nats')
const httpCodes = require('../../../utils/httpStatusCodes')

const ThreadController = require('./controller');

//TODO: !IMPORTANT make this more sophisticated, as all servers are pinged this way 
nats.subscribe(`thread.>`, function (msg, reply, subject) {
    publishClients(subject, msg)
});


class ThreadRealtime {

    static broadcast(tid, msg) {
        broadcastServers(`thread.${tid}`, msg);
    }

    static async subscribe(comms) {
        try {
            const subscribed = await ThreadController.subscribe(comms);
            if (subscribed) {
                let channel = `/thread/${comms.obj.tid}`;
                comms.ws.subscribe(channel);
                return { slug: channel, action: 'subscribed', ok: true };
            } else {
                throw { code: httpCodes.UNAUTHORIZED, msg: 'You are not authorized to subscribe to this thread.' }
            }
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error subscribing thread."
            };
            return null;
        }
    }
}


module.exports = ThreadRealtime;