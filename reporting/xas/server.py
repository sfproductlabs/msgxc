from flask import Flask, request, make_response
from flask.json import jsonify
from os import path, walk

app = Flask(__name__)

@app.route("/", methods=['GET'])
def index():
    ajwt = request.cookies.get('ajwt')
    resp = make_response(jsonify(id=3), 404)
    resp.headers['X-Something'] = 'A valuex'
    return resp

@app.route("/mirror", methods=['POST'])
def mirror():
    return jsonify(request.get_json(force=True))

@app.route("/q", methods=['POST'])
def q():
    #application/json    
    ajwt = request.cookies.get('ajwt')
    resp = make_response(jsonify(id=3), 404)
    resp.headers['X-Something'] = 'A valuex'
    return resp

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
    app.run(extra_files=extra_files)