'use strict';

const Threading = require('./model');
const httpCodes = require('../../../utils/httpStatusCodes')

class ThreadController {

   
    static async publish(comms) {
        try {
            return await Threading.publish(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error publishing thread."
            };
            throw comms.error;
        }
    }

    static async subscribe(comms) {
        try {
            return await Threading.subscribe(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error subscribing thread."
            };
            throw comms.error;
        }
    }

    static async unsubscribe(comms) {
        try {
            return await Threading.unsubscribe(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error unsubscribing thread."
            };
            throw comms.error;
        }
    }


}


module.exports = ThreadController;