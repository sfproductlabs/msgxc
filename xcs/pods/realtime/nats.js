const {
    nats
} = require('../../utils/nats');
const debugNats = require('debug')('realtime-nats')
const debugWS = require('debug')('realtime-ws')
const R = require('ramda');


const broadcastServers = (subject, msg) => {
    nats.publish(subject, typeof msg === 'object' ? JSON.stringify(msg) : msg, (ex) => {
        debugNats("Broadcast servers: (out) ", subject, "Exception:", ex)
    });
}

const prepClientMessage = (subject, msg) => {
 const slug = `/${(subject||"").replace(/\./g,"\/")}`
 const obj = typeof msg === 'object' ? msg : { value: msg };
 obj.slug = slug;
 obj.ok = true;
 obj.msg = JSON.stringify(obj)
 return obj;
}

const publishClients = (subject, msg, ws) => {
    const cm = prepClientMessage(subject, msg);
    if (ws) {
        debugWS('Publish to (others): #', cm.slug)
        ws.publish(cm.slug, cm.msg);
    }
    else {
        //TODO: AG USE the app.publish when its released
        debugWS('Publish to (all)', cm.slug)
        appInstance().publish(cm.slug, cm.msg)
    }

}

const broadcastClients = (subject, msg) => {
    let sockets = wsSockets();
    let idle = wsIdle();
    const cm = prepClientMessage(subject, msg);
    debugWS('Broadcasting: ', cm.slug)
    sockets.forEach(function (c) {
        //if (c.upgradeReq.url === client.upgradeReq.url && c.id !== client.id) {
        //if (c && c.readyState === c.OPEN) {
        //count++;        
        if (!c.send(cm.msg)) {
            debugWS('Removing dead ws-cxn for now')
            sockets.delete(c);
            idle.add(c); //TODO: AG could process
        }
        //}
    })
}

module.exports = {
    broadcastServers,
    broadcastClients,
    publishClients
}