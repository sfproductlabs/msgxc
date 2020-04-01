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
    headers = {
        "Connection": "keep-alive",
        "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.52 Safari/536.5",
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Cookie": "ASP.NET_SessionId=j1r1b2a2v2w245; GSFV=FirstVisit=; GSRef=https://www.google.fr/url?sa=t&rct=j&q=&esrc=s&source=web&cd=1&ved=0CHgQFjAA&url=https://www.mywbsite.fr/&ei=FZq_T4abNcak0QWZ0vnWCg&usg=AFQjCNHq90dwj5RiEfr1Pw; HelpRotatorCookie=HelpLayerWasSeen=0; NSC_GSPOUGS!TTM=ffffffff09f4f58455e445a4a423660; GS=Site=frfr; __utma=1.219229010.1337956889.1337956889.1337958824.2; __utmb=1.1.10.1337958824; __utmc=1; __utmz=1.1337956889.1.1.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided)"
    }
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