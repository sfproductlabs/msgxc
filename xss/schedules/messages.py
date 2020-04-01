import requests
import uuid
from elasticsearch import Elasticsearch
from os import path, walk, getenv
import time

# TODO: Not implemented yet
es = Elasticsearch(getenv('ELASTIC_HOSTS').split(','), sniff_on_connection_fail=True, sniffer_timeout=60)

def process_scheduled_messages():
    #Setup this queue id
    qid = str(uuid.uuid1())
    svc = 'xss'
    now = int(round(time.time() * 1000))
    #print("now", now) # checked: update mstore set scheduled='2020-04-01 04:14:34+0000' where tid=5ae3c890-5e55-11ea-9283-4fa18a847130 and mid=7edf6140-73cd-11ea-aaaf-3b383fad559b;
    res = es.search(index="mstore", body={
                'query': {
                    'bool': {
                        'must': [
                            { 'exists': { 'field': "scheduled" } },
                            { "range" : {"scheduled" : { "lte" : now, "format" : "epoch_millis" } } }
                        ]
                    }
                },
                'sort': [
                    { 'scheduled': 'asc' }
                ]
            }
    )
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
        # print("%(mid)s %(tid)s" % hit["_source"])
    return res