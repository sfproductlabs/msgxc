/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Message model; messages used for chats                                                         */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const cxn = require('../../utils/cassandra');
const axios = require('axios');

class Reports {

    static async xasDbVersion(comms) {
        try {
            let opts = {
                url: `${process.env.XAS_URL}/version`,
                method: "get",
                headers: {
                }
            };
            if (comms.headers.cookie)
                opts.headers.Cookie = comms.headers.cookie;
            if (comms.headers.authorization)
                opts.headers.Authorization = comms.headers.authorization;
            const result = await axios.request(opts)
            if (result && result.data && result.data.length > 0)
                return result.data[0];
            else 
                return null;
        } catch (ex) {
            console.error(ex)
            return null;
        }
    }

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Reports;