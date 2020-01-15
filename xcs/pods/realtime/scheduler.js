const {
    nats
} = require('../../utils/nats');
const debug = require('debug')('scheduler')
const R = require('ramda');


nats.subscribe(`system.>`, {'queue':'system.workers'}, function(msg, reply, subject) {
    debug(new Date().toISOString(),"System worker: (in) ", subject, msg, "Reply:", reply)
});

module.exports = {
    
}