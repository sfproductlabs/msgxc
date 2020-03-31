/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Message model; messages used for chats                                                         */
/*                                                                                                */
/* All database calls go through the model.                                                       */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const es = require('../../utils/elastic');

class Reports {

    static async getRecentMessages(comms) {
        return await es.client.search({
            index: 'mstore',
            body: {
                query: {
                    bool:{
                        must_not:{
                            bool: {
                                must: [
                                    { exists: { field: "scheduled" } }
                                ]
                            }
                        }
                    }
                },
                sort: [
                    { updated: 'desc' }
                ]
            }
        })
    }

    static async getUpcomingMessages(comms) {
        return await es.client.search({
            index: 'mstore',
            body: {
                query: {
                    bool: {
                        must: [
                            { exists: { field: "scheduled" } }
                        ]
                    }
                },
                sort: [
                    { scheduled: 'asc' }
                ]
            }
        })
    }


}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = Reports;