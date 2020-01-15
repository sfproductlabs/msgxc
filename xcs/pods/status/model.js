/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Message model; messages used for chats                                                         */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const db = require('../../utils/cassandra');

class Status {

    static async getDbVersion() {
        try {
            return (await cxn.client.execute(
                `select next_seq as version from sequences where name=?`, [
                    'DB_VER'
                ], {
                    prepare: true
                })).first()
        } catch (ex) {
            return null;
        }
    }  

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Status;