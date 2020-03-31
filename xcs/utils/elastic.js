const elasticsearch = require('@elastic/elasticsearch');
const fs = require('fs');
const R = require('ramda');

const opts = {
    apiVersion: '5.6',
    nodes: process.env.CASSANDRA_HOSTS.split(",").map(host => `http${process.env.CASSANDRA_VERIFY_SERVER ? 's' : ''}://${host}:${process.env.ELASTIC_PORT || '443'}`),
    selector: 'roundRobin',
    requestTimeout: 15000,
    pingTimeout: 3000,
    deadTimeout: 60000,
    maxRetries: 3,
    resurrectStrategy: 'ping',
    keepAlive: true,
    keepAliveInterval: 1000,
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    sniffEndpoint: '_nodes/_all/http'
};

if (process.env.CASSANDRA_VERIFY_SERVER) {
    opts.ssl = {
        key: fs.readFileSync(process.env.CASSANDRA_SERVER_KEY),
        cert: fs.readFileSync(process.env.CASSANDRA_SERVER_CERT),
        ca: [fs.readFileSync(process.env.CASSANDRA_CA_CERT)],
        rejectUnauthorized: process.env.CASSANDRA_VERIFY_SERVER
    }
}

const client = new elasticsearch.Client(opts);


async function query(query = '', options) {

    let qopts = {
        index: process.env.ELASTIC_INDEX_DEFAULT,
        type: process.env.ELASTIC_TYPE_DEFUALT,
        size: Number(process.env.ELASTIC_SIZE_DEFUALT || 100),
        from: 0,
        must_not: ''
    };

    if (typeof query === 'string') {
        if (typeof options === 'object') {
            qopts = {...qopts, ...options}
        }
        query = query.replace(/-/g, ' ');
        query = query.replace(/@/g, ' @ ');
        //https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
        query = query.replace(/\+|\-|\=|\&|\||\>|\<|\!|\(|\)|\{|\}|\[|\]|\^|\"|\~|\?|\:|\\|\//g, '');

        return await client.search({
            index: qopts.index,
            type: qopts.type,
            from: qopts.from,
            size: qopts.size,
            body: {
                query: {
                    bool: {
                        must: {
                            query_string: {
                                query,
                                default_operator: 'AND',
                                analyze_wildcard: true
                            }
                        },
                        must_not: {
                            query_string: {
                                query: qopts.must_not
                            }
                        }
                    }
                },
                sort: [
                    (qopts.sort || { updated: 'desc' })
                ]
            }
        });
    } else if (typeof query === 'object') {
        if (query.body) {
            return await client.search({ ...qopts, ...query});
        } else {
            qopts = {...qopts, ...options || {}}
            qopts.body = qopts.body || {};
            qopts.body.query = { ...(qopts.body.query || {}), ...query };
            return await client.search( qopts );
        }
        
    } else {
        return null;
    }
}


module.exports = {
    client,
    query
}
