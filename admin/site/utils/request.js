import fetch from 'unfetch'
import Cookies from 'js-cookie';
import * as R from 'ramda'



const camelFinder = /^(?!CloudFront-)([A-Z])|[_](\w)/g;
function toCamelCase(str) {
    return str.replace(camelFinder, function (match, p1, p2, offset) {
        if (p2) return p2.toUpperCase();
        return p1.toLowerCase();
    });
};
function parseCamel(json) {
    if (!json) {
        return json;
    }
    let key, destKey;
    Object.keys(json).map(function (key, index) {
        if (typeof json[key] === "object" && json[key] !== null) {
            json[key] = parseCamel(json[key]);
        }
        destKey = toCamelCase(key);
        if (key !== destKey) {
            Object.defineProperty(json, destKey, Object.getOwnPropertyDescriptor(json, key));
            delete json[key];
        }
    });
    return json;
}

function parseJSON(response) {        
    if (/application\/json/i.test(response.headers.get('content-type')))
        return response.json();
    else return null;
}


function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }

    const error = new Error(response.statusText);
    error.response = response;
    return Promise.reject(error);
}

function catchError(err) {
    throw err;
}

//ONLY USE THIS FOR INTERNAL FETCHES
export default function request(url, options) {
    let token = Cookies.get(process.env.CLIENT_AUTH_COOKIE);
    let opts = R.defaultTo({})(options);
    let track = R.defaultTo(false)(opts.track);
    let camelize = R.defaultTo(true)(opts.camelize);
    let jwt = token ? { "Authorization": "Bearer " + token } : {};
    if (track) {
        setTimeout(function () {                    
            fetch(process.env.TRACK_URL, {
                method: "POST",
                body: JSON.stringify(track),
                headers: jwt
            });
        }, 3000);
        delete opts.track;
    }
    if (typeof opts.body === "object") {
        opts.body = JSON.stringify(opts.body);
    }
    opts.headers = R.defaultTo({})(opts.headers);
    opts.headers = {
        "Content-Type":"text/plain",
        ...opts.headers,
        ...jwt
    };
    if (opts.noAuth) delete opts.headers.Authorization;    
    if (camelize)
        return fetch(url, opts)
            .then(checkStatus)
            .then(parseJSON)
            .then(parseCamel)
            .catch(catchError);           
    else
        return fetch(url, opts)
            .then(checkStatus)
            .then(parseJSON)
            .catch(catchError); 
}
