const {
    consumer,
    producer
} = require('../../utils/kafka');
const debugKafka = require('debug')('realtime-kafka')
const R = require('ramda');


const broadcastServers = (topic, messages) => {
    producer.send([{
        topic: topic,
        messages: messages
    }, ], function (err, data) {
        debugKafka("Broadcast servers: (out) ", topic, messages, data)
        if (err)
            console.error(err);
    });
}

const publishClients = (msg) => {
    //TODO: Publish in library uWebSockets.js has a bug so broadcasting for now
    broadcastClients(msg);
}

const broadcastClients = (msg) => {
    let sockets = wsSockets();
    let idle = wsIdle();
    let packet = JSON.stringify(R.pick(['value', 'topic'],msg));
    sockets.forEach(function (c) {
        //if (c.upgradeReq.url === client.upgradeReq.url && c.id !== client.id) {
        //if (c && c.readyState === c.OPEN) {
        //count++;
        
        if (!c.send(packet)) {
            sockets.delete(c);
            idle.add(c);
        }
        //}
    })
}

consumer.on('message', function (msg) {
    debugKafka("Broadcast servers: (in) ", msg)
    publishClients(msg)
});

module.exports = {
    broadcastServers
}