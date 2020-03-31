const R = require('ramda');
const httpCodes = require('../utils/httpStatusCodes')
const readJson = require('../utils/readJson')
const readRaw = require('../utils/readRaw')
const SMS = require('../utils/sms')
const querystring = require('querystring');
const debugWS = require('debug')('ws')
const debugHTTP = require('debug')('http')
const {
    generateClaim
} = require('../utils/ajwt')
const nats = require('../utils/nats')

const SysMessageController = require('./messaging/sys/controller');
const ThreadController = require('./messaging/thread/controller');
const ThreadRealtime = require('./messaging/thread/realtime');
const AuthController = require('./auth/controller');
const StatusController = require('./status/controller');
const ReportsController = require('./reports/controller');



//ROUTE STUFF HERE
class Route {
    constructor(comms) {
        this.comms = comms
        this.authorizeUser = this.authorizeUser.bind(this);
        this.authorizeOwner = this.authorizeOwner.bind(this);
    }

    //send a ws or res
    static abort(channel, error) {
        if (!error) {
            error = { error: httpCodes.INTERNAL_SERVER_ERROR, ok: false, code: httpCodes.INTERNAL_SERVER_ERROR, msg: 'UNKNOWN ERROR OCCURRED )\'(' }
        }
        if (channel.send) {
            channel.send(JSON.stringify(error));
        } else {
            if (!channel.aborted) {
                channel.writeStatus(error.code || httpCodes.INTERNAL_SERVER_ERROR);
                channel.end(JSON.stringify(error.msg || error || 'UNKNOWN ERROR OCCURRED )\'('))
            }
        }

    }

    respond(obj) {
        switch (this.comms.protocol) {
            case "ws":
                let wso = {};
                if (this.comms.error) {
                    if (this.comms.error.msg) {
                        wso = {
                            error: this.comms.error.code || this.comms.error.msg,
                            code: this.comms.error.code && this.comms.error.code.length > 2 ? this.comms.error.code.slice(0,3) : this.comms.error.code,
                            msg: this.comms.error.msg,
                            slug: this.comms.obj.slug,
                            ok: false
                        }
                    } else {
                        wso = {
                            error: this.comms.error,
                            slug: this.comms.obj.slug,
                            ok: false
                        }
                    }
                    nats.natsLogger.error({ ...this.comms, error: JSON.stringify(wso) });
                } else {
                    wso = {
                        slug: this.comms.obj.slug,
                        data: obj,
                        ok: true
                    }
                }
                this.comms.ws.send(JSON.stringify(wso), this.comms.isBinary);
                break;
            case "rest":
                if (!this.comms.res.aborted) {
                    if (this.comms.error) {
                        this.comms.res.cork(() => {
                            nats.natsLogger.error(this.comms);
                            this.comms.res.writeStatus(this.comms.error.code || httpCodes.INTERNAL_SERVER_ERROR);
                            this.comms.res.end(JSON.stringify(this.comms.error));
                        });
                    } else {
                        this.comms.res.cork(() => {
                            this.comms.res.writeStatus(httpCodes.OK);
                            this.comms.res.writeHeader("Content-Type", this.comms.contentType || "application/json")
                            this.comms.res.writeHeader('Access-Control-Allow-Origin', '*'); //TODO: Update CORS                            
                            this.comms.res.end(this.comms.contentType ? obj : JSON.stringify(obj));
                        });
                    }
                }
                break;
            default:
                break;
        }
    }

    authorizeUser(level) {
        //Coder is responsible for multiple calls
        //Do not skip. May need for multiple level checking
        // if (typeof this.comms.user === 'object') {
        //     return this;
        // }
        let token = null;
        switch (this.comms.protocol) {
            case "ws":
                token = this.comms.obj.jwt || this.comms.ws.authorization;
                break;
            default:
                token = this.comms.authorization || R.path(['headers', 'authorization'], this.comms);
                break;
        }
        if (typeof token !== 'string' || !token) {
            this.comms.error = {
                code: httpCodes.UNAUTHORIZED,
                msg: 'Authorization Failed (1)'
            };
            throw this.comms.error;
        }
        const tokenSplit = token.match(/(?:Bearer)+ (.*)/i);
        if (tokenSplit) {
            if (tokenSplit.length != 2 || !tokenSplit[1]) {
                this.comms.error = {
                    code: httpCodes.UNAUTHORIZED,
                    msg: 'Authorization Failed (2)'
                };
                throw this.comms.error;
            } else {
                token = tokenSplit[1];
            }
        }
        AuthController.authorizeUser(this.comms, token, level);
        if (!this.comms.user) {
            this.comms.error = {
                code: httpCodes.UNAUTHORIZED,
                msg: 'Authorization Failed (3)'
            };
            throw this.comms.error;
        }

        return this;
    }

    //Need to call authorizeUser yourself PRIOR
    authorizeOwner(record) {
        if (!this.comms.user || !record || !record.owner || (record.owner != this.comms.user.id)) {
            this.comms.error = {
                code: httpCodes.UNAUTHORIZED,
                msg: 'Authorization Failed (Owner)'
            };
            throw this.comms.error;
        }
        return this;
    }

    async getDbVersion() {
        let version = 0;
        try {
            version = await StatusController.getDbVersion();
        } catch (ex) {
            let errMsg = "Unknown error occurred getting database version";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(version);
    }

    async xasDbVersion() {
        let version = 0;
        try {
            version = await StatusController.xasDbVersion(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error occurred getting xas version";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(version);
    }

}

class RestRoute extends Route {
    constructor(comms) {
        super(comms);
        this.comms.protocol = 'rest';
        this.comms.url = this.comms.req.getUrl();
        this.comms.method = this.comms.req.getMethod();
        try {
            this.comms.qparams = querystring.parse(this.comms.req.getQuery());
        } catch {
            this.comms.qparams = {};
        }
        debugHTTP(`Request (${this.comms.method}) to ${this.comms.url} : `);
        this.comms.headers = {};
        this.comms.req.forEach((k, v) => {
            this.comms.headers[k] = v;
        });
        this.comms.res.onAborted(() => {
            //this.comms.res.writeStatus(httpCodes.METHOD_FAILURE);
            console.warn("Connection Aborted")
            //TODO kafka
            this.comms.res.aborted = true;
        });

        this.processPayload = this.processPayload.bind(this);
    }


    parseRaw() {
        /* Note that you cannot read from req after returning from here */
        const _that = this;
        return new Promise(function (resolve, reject) {
            /* Read the body until done or error */
            readRaw(_that.comms.res, (obj) => {
                resolve(obj)
            }, (err) => {
                /* Request was prematurely aborted or invalid or missing, stop reading */
                let errMsg = "Raw Parse Error";
                console.warn(errMsg)
                try {
                    //_that.comms.res.close();
                    _that.comms.error = {
                        code: httpCodes.INTERNAL_SERVER_ERROR,
                        msg: errMsg
                    };

                    //TODO kafka
                    _that.comms.res.aborted = true;
                } finally {
                    reject(err);
                }
            })
        })
    }

    parseJson() {
        /* Note that you cannot read from req after returning from here */
        const _that = this;
        return new Promise(function (resolve, reject) {
            /* Read the body until done or error */
            readJson(_that.comms.res, (obj) => {
                resolve(obj)
            }, (err) => {
                /* Request was prematurely aborted or invalid or missing, stop reading */
                let errMsg = "JSON Parse Error";
                console.warn(errMsg)
                try {
                    //_that.comms.res.close();
                    _that.comms.error = {
                        code: httpCodes.INTERNAL_SERVER_ERROR,
                        msg: errMsg
                    };

                    //TODO kafka
                    _that.comms.res.aborted = true;
                } finally {
                    reject(err);
                }
            })
        })
    }

    async processPayload() {
        if (!this.comms.obj) {
            this.comms.obj = await this.parseJson();
        }
        return this;
    }

    async processRawPayload() {
        if (!this.comms.obj) {
            this.comms.obj = await this.parseRaw();
        }
        return this;
    }

    async broadcast() {
        let result = null;
        try {
            await this.processPayload();
            result = await SysMessageController.broadcast(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error broadcasting";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async multicast() {
        let result = null;
        try {
            await this.processPayload();
            result = await SysMessageController.multicast(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error multicasting";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }


    async send() {
        let result = null;
        try {
            await this.processPayload();
            result = await SysMessageController.send(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error sending";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async enlist() {
        let result = null;
        try {
            await this.processPayload();
            result = await SysMessageController.enlist(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error enlisting";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async publish() {
        let result = null;
        try {
            await this.processPayload();
            result = await ThreadController.publish(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error publishing";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async subscribe() {
        let result = null;
        try {
            await this.processPayload();
            result = await ThreadController.subscribe(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error subscribing";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async unsubscribe() {
        let result = null;
        try {
            await this.processPayload();
            result = await ThreadController.unsubscribe(this.comms);
        } catch (ex) {
            let errMsg = "Unknown error unsubscribing";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    async getReport() {
        let result = null;
        try {  
            switch (this.comms.params.report) {
                case "messages_recent":
                    result = await ReportsController.getRecentMessages(this.comms);
                    break;
                case "messages_upcoming":
                    result = await ReportsController.getUpcomingMessages(this.comms);
                    break;                    
                default:
                    result = []
                    break;
            }          
        } catch (ex) {
            let errMsg = "Unknown error generating report";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }
}

class WSRoute extends Route {
    constructor(comms) {
        super(comms);
        this.comms.protocol = 'ws';
    }

    async subscribeWebsocket() {
        let result = null;
        try {
            switch (this.comms.params.action) {
                case "thread":
                    result = await ThreadRealtime.subscribe(this.comms);
                    break;
                default:
                    throw ({ code: httpCodes.BAD_REQUEST, msg: "Unsupported subscription type" });
            }
        } catch (ex) {
            let errMsg = "Unknown error subscribing";
            console.warn(errMsg, ex);
            if (!this.comms.error) {
                this.comms.error = {
                    code: ex.code || httpCodes.INTERNAL_SERVER_ERROR,
                    msg: ex.msg || errMsg
                };
            }
        }
        this.respond(result);
    }

    sendError(ex) {
        if (!ex) {
            ex = this.comms.error || { code: httpCodes.INTERNAL_SERVER_ERROR, msg: 'Unknown server error occurred' };
        }
        if (typeof ex === 'string') {
            nats.natsLogger.error({ ...comms, error: ex });
            this.comms.ws.send(`{ "error" : "${httpCodes.INTERNAL_SERVER_ERROR}", "code": "${httpCodes.INTERNAL_SERVER_ERROR}", "ok": false, "slug" : "${comms.obj.slug}", "action" : "${comms.params ? comms.params.action : "undefined"}", "msg" : "${ex}" }`, isBinary);
        } else {
            nats.natsLogger.error({ ...comms, error: JSON.stringify(ex) });
            this.comms.ws.send(`{ "error" : "${ex.code}", "code": "${ex.code}", "ok": false, "slug" : "${comms.obj.slug}", "action" : "${comms.params.action}", "msg" : "${ex.msg}" }`, isBinary);
        }
    }

}

module.exports = {
    Route,
    RestRoute,
    WSRoute
}
