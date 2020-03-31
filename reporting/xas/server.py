import settings
import json
from flask import Flask, request, make_response, render_template
from flask.json import jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException ,InternalServerError
from os import path, walk, getenv
from ssl import SSLContext, PROTOCOL_TLSv1
from pathlib import Path

import queries.hive as queries
import ajwt.utils as ajwt


#Setup SSL
ssl_opts = { 
    'ssl_version': PROTOCOL_TLSv1,
    'keyfile': getenv('SITE_KEY'),
    'certfile': getenv('SITE_CERT') 
}
context = SSLContext(PROTOCOL_TLSv1,ssl_opts=ssl_opts)

#Setup AJWT
pubKey = None
if getenv('AJWT_CERT') != None:
    pubKey = Path(getenv('AJWT_CERT')).read_text()
privKey = None
if getenv('AJWT_KEY') != None:
    privKey = Path(getenv('AJWT_KEY')).read_text()
secret = getenv('APP_SECRET')

#Run app
V1_PREFIX=getenv('V1_PREFIX')
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) #TODO: USE REAL CORS

def make_error(err):
    if type(err) is dict:
        return json.dumps({ 
            "error" : {
                "code": err.get('code'),
                "name": err.get('name'),
                "msg": err.get('msg')
            },
            "ok" : False
        })
    else:
        return json.dumps({ 
        "error" : {
            "code": err.code,
            "name": err.name,
            "msg": err.description,
        },
        "ok" : False
    })
    
#TODO: Uncomment for production
# @app.errorhandler(HTTPException)
# def handle_http_error(err):
#     """Return JSON instead of HTML for HTTP errors."""
#     # start with the correct headers and status code from the error
#     resp = err.get_response()
#     # replace the body with JSON
#     resp.data = make_error(err)
#     resp.content_type = "application/json"    
#     return resp

# @app.errorhandler(Exception)
# def handle_exception(err):
#     # pass through HTTP errors
#     if isinstance(err, HTTPException):
#         return err
#     return render_template("500.html", e=err), 500    

# @app.errorhandler(InternalServerError)
# def handle_500(e):
#     original = getattr(e, "original_exception", None)
#     if original is None:
#         # direct 500 error, such as abort(500)
#         return render_template("500.html"), 500
#     # wrapped unhandled error
#     return render_template("500.html", e=original), 500

def auth(req, roles=[], rights=[], tags=[]):    
    token = req.cookies.get(getenv('CLIENT_AUTH_COOKIE'))
    if token == None:
        token = (
            request.headers["Authorization"] if "Authorization" in request.headers else None
        )
    if token == None:
        try:
            data = request.get_json(force=True)
            token = data.get(getenv('CLIENT_AUTH_COOKIE'))
            if token == None:
                token = data.get('ajwt')
        except:
            pass
    if token == None or len(token) == 0:
        raise Exception('bad token')
    token = token.replace('Bearer ', '', 1)
    token = ajwt.decode(token, privkey=privKey, pubkey=pubKey, secret=secret, algorithms=['HS256','RS256'])
    return token, ajwt.authorize(token,roles=roles,rights=rights,tags=tags)

@app.route("/ping", methods=['GET'])
def index():
    #ajwt = request.cookies.get('ajwt')
    resp = make_response(jsonify(data='pong'), 200)
    resp.headers['X-PING'] = 'PONG'
    return resp

@app.route("/mirror", methods=['POST'])
def mirror():
    return jsonify(request.get_json(force=True))

@app.route(f'{V1_PREFIX}/version', methods=['GET'])
def version(name=None):
    resp = make_response(queries.version(),200)   
    resp.content_type = "application/json" 
    return resp

@app.route(f'{V1_PREFIX}/q/')
@app.route(f'{V1_PREFIX}/q/<name>', methods=['GET'])
def q(name=None):
    user = None
    #Authorize
    try: 
        user, _ = auth(request,tags=["admin"],roles=['msgxc_admin'])
    except Exception as err :   
        resp = make_response(make_error({"code": 401, "msg": str(err)}), 401)   
        resp.content_type = "application/json" 
        return resp
    #Return Query
    if name == 'sequences':
        resp = make_response(queries.sequences(),200)   
        resp.content_type = "application/json" 
    elif name == 'messages_recent':
        resp = make_response(queries.messages_recent(),200)   
        resp.content_type = "application/json" 
    elif name == 'version':        
        resp = make_response(queries.version(),200)   
        resp.content_type = "application/json"         
    else:
        resp = make_response(make_error({"code": 400, "msg": "bad url"}), 400)   
        resp.content_type = "application/json" 
    return resp

if __name__ == "__main__":
    app.config["TEMPLATES_AUTO_RELOAD"] = True
    extra_dirs = ['.',]
    extra_files = extra_dirs[:]
    for extra_dir in extra_dirs:
        for dirname, dirs, files in walk(extra_dir):
            for filename in files:
                filename = path.join(dirname, filename)
                if path.isfile(filename):
                    extra_files.append(filename)
    app.run(extra_files=extra_files, ssl_context='adhoc')