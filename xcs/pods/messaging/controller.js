'use strict';

const Messaging = require('./model');
const httpCodes = require('../../utils/httpStatusCodes')

class MessageController {


    static async broadcast(comms) {
        try {
            await Messaging.broadcast(comms);            
            return true;
        } catch (ex) {
            console.warn(ex);
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error broadcasting."
            };
            throw comms.error;
        }
    }

    static send(comms) {
        comms.error = {
            code: httpCodes.NOT_IMPLEMENTED,
            msg: "Unknown server error sending."
        };
        throw comms.error;
    }


}


module.exports = MessageController;