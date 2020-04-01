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


    static async cancel(comms) {
        try {
            return await Threading.cancel(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error canceling thread."
            };
            throw comms.error;
        }
    }

    static async execute(comms) {
        try {
            return await Threading.execute(comms);            
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error executing message."
            };
            throw comms.error;
        }
    }


}


module.exports = ThreadController;