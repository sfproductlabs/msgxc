import requests
import uuid
from elasticsearch import Elasticsearch
from os import path, walk, getenv

# TODO: Not implemented yet
es = Elasticsearch(["localhost"], sniff_on_connection_fail=True, sniffer_timeout=60)

def process_scheduled_messages():
    #Setup this queue id
    qid = str(uuid.uuid1())
    svc = 'xss'
    res = es.search(index="mstore", body={"query": {"match_all": {}}})
    print("Got %d messages:" % res['hits']['total'])
    for hit in res['hits']['hits']:
        data = {'tid' : hit["_source"]['tid'], 'mid' : hit["_source"]['mid'], 'qid' : qid, 'svc' : svc }
        r = requests.post(
            "%s%s/execute/message" % ( getenv('XCS_URL'), getenv('V2_PREFIX') ), 
            json=data, 
            verify=True,
            headers={
                'Authorization' : 'Bearer %s' % getenv('AJWT_CLIENT_KEY')
            }
        )
        print(repr(r.json()))
        print("%(mid)s %(tid)s" % hit["_source"])
    return res