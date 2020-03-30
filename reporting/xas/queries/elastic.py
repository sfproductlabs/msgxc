from elasticsearch import Elasticsearch

# TODO: Not implemented yet
es = Elasticsearch(["localhost"], sniff_on_connection_fail=True, sniffer_timeout=60)

def threads():
    res = es.search(index="mthreads", body={"query": {"match_all": {}}})
    print("Got %d Hits:" % res['hits']['total'])
    # for hit in res['hits']['hits']:
    #     print("%(timestamp)s %(author)s: %(text)s" % hit["_source"])
    return res