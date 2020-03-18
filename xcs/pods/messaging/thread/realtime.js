const { nats } = require('../../../utils/nats');
const { publishClients, broadcastServers } = require('../../realtime/nats')
const httpCodes = require('../../../utils/httpStatusCodes')

const Threading = require('./model');

nats.subscribe(`thread.>`, function(msg, reply, subject) {
    publishClients(subject, msg)
});

const broadcast = (tid, msg) => {
    broadcastServers(`thread.${tid}`, msg);
}

const subscribe = async (comms) => {
    try {
        if (await Threading.subscribe(comms)) {
            let channel = `/thread/${comms.obj.tid}`;    
            comms.ws.subscribe(channel);
            return {slug: channel, ok: true, action : 'subscribed' };      
        } else {
            throw { code : httpCodes.UNAUTHORIZED, msg: 'You are not authorized to subscribe to this thread.' }
        }
    } catch (ex) {
        console.warn(ex);
        comms.error = {
            code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
            msg: ex.msg || "Unknown server error subscribing thread."
        };
        throw comms.error;
    }
}

             
module.exports = {
    broadcast,
    subscribe
}