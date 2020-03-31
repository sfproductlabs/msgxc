'use strict';

const Reports = require('./model');
const httpCodes = require('../../utils/httpStatusCodes')

class ReportsController {

    static async getRecentMessages(comms) {
        try {
            return await Reports.getRecentMessages(comms);            
        } catch (ex) {
            comms.error = {
                code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                msg: ex.msg || "Unknown server error getting recent messages."
            };            
            throw ex;
        }
    }




}


module.exports = ReportsController;