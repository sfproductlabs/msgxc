/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Message model; messages used for chats                                                         */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const cxn = require('../../utils/cassandra');

class Status {

    static async getDbVersion() {
        const db = new cxn();
        try {
            return (await db.client.execute(
                `select seq as version from sequences where name=?`, [
                    'DB_VER'
                ], {
                    prepare: true
                })).first()
        } catch (ex) {
            console.error(ex)
            return null;
        }
    }  

}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Status;