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
    if (await Threading.canSubscribe(comms)) {
        let channel = `/thread/${comms.obj.thread}`;    
        comms.ws.subscribe(channel);
        return {slug: channel, ok: true, action : 'subscribed' };      
    } else {
        throw {code : httpCodes.UNAUTHORIZED, msg: 'You are not authorized to subscribe to this thread.' }
    }
}

             
module.exports = {
    broadcast,
    subscribe
}