/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Message model; messages used for chats                                                         */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const cxn = require('../../utils/cassandra');
const axios = require('axios');

class Status {

    static async getDbVersion() {
        const db = new cxn();
        try {
            return (await db.client.execute(
                `select seq as version from sequences where name=?`, [
                    'MSGXC_VER'
                ], {
                    prepare: true
                })).first()
        } catch (ex) {
            console.error(ex)
            return null;
        }
    }  

    static async xasDbVersion(comms) {
        try {
            let opts = {
                url: `${process.env.XAS_URL}${process.env.V1_PREFIX}/version`,
                method: "get",
                headers: {
                }
            };
            //PASSTHROUGH AUTH
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

module.exports = Status;