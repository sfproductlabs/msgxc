'use strict';

// Load the twilio module
const twi = require('twilio');
const debug = require('debug')('sms')
const httpCodes = require('./httpStatusCodes')

let twilio = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
    twilio = new twi(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
}
class SMS {

    static async send(to, msg) {
        // Create a new REST API client to make authenticated requests against the
        // twilio back end
        // Pass in parameters to the REST API using an object literal notation. The
        // REST client will handle authentication and response serialzation for you.
        if (!twilio) {
            return null;
        }

        return await new Promise(function (resolve, reject) {
            twilio.messages.create({
                to: to,
                from: process.env.TWILIO_SENDER_NUMBER,
                body: msg
            }, function (error, message) {
                // The HTTP request to Twilio will run asynchronously. This callback
                // function will be called when a response is received from Twilio
                // The "error" variable will contain error information, if any.
                // If the request was successful, this value will be "falsy"
                if (!error) {
                    // The second argument to the callback will contain the information
                    // sent back by Twilio for the request. In this case, it is the
                    // information about the text messsage you just sent:
                    debug('SMS sent:', to, message.sid, message.dateCreated);
                    resolve(message.sid)

                } else {
                    reject({
                        code: httpCodes.NOT_ACCEPTABLE,
                        msg: `Error sending message to ${to}, ${error}`
                    });
                }
            });
        });
    }
}

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = SMS;