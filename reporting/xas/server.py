import settings
from flask import Flask, request, make_response
from flask.json import jsonify
from os import path, walk, getenv
from flask_cors import CORS
from ssl import SSLContext, PROTOCOL_TLSv1
from elasticsearch import Elasticsearch

#Setup
ssl_opts = { 
    'ssl_version': PROTOCOL_TLSv1,
    'keyfile': getenv('SITE_KEY'),
    'certfile': getenv('SITE_CERT') 
}
context = SSLContext(PROTOCOL_TLSv1,ssl_opts=ssl_opts)
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) #TODO: USE REAL CORS
es = Elasticsearch()

@app.route("/ping", methods=['GET'])
def index():
    #ajwt = request.cookies.get('ajwt')
    resp = make_response(jsonify(data='pong'), 200)
    resp.headers['X-PING'] = 'PONG'
    return resp

@app.route("/mirror", methods=['POST'])
def mirror():
    return jsonify(request.get_json(force=True))

@app.route("/q", methods=['GET'])
def q():
    #application/json    
    ajwt = request.cookies.get('ajwt')
    resp = make_response(jsonify(id=3), 404)
    resp.headers['X-Something'] = 'A valuex'
    res = es.search(index="mthreads", body={"query": {"match_all": {}}})
    print("Got %d Hits:" % res['hits']['total'])
    # for hit in res['hits']['hits']:
    #     print("%(timestamp)s %(author)s: %(text)s" % hit["_source"])
    return resp

# @app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
# @app.route('/<path:path>', methods=['OPTIONS'])
# def catch_all():
#     #resp = make_response(None, 200)
#     resp.headers["Content-Type"] =  "application/json"
#     resp.headers["Access-Control-Allow-Origin"] = "*" #TODO: FIX
#     resp.headers["Access-Control-Allow-Methods"] = "GET, POST, HEAD, DELETE, PUT"
#     resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Header, Authorization, Accept, User"
#     resp.headers["Access-Control-Allow-Credentials"] = "true"
#     resp.headers["Access-Control-Max-Age"] = "1728000"
#     resp.headers["Vary"] = "Accept-Encoding, Origin"
#     resp.headers["Keep-Alive"] = "timeout=2, max=100"
#     resp.headers["Connection"] = "Keep-Alive"
#     resp.headers["Author"] = "SFPL"
#     return resp

# @app.route('/hello/')
# @app.route('/hello/<name>')
# def hello(name=None):
#     return render_template('hello.html', name=name)

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