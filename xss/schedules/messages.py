from elasticsearch import Elasticsearch

# TODO: Not implemented yet
es = Elasticsearch(["localhost"], sniff_on_connection_fail=True, sniffer_timeout=60)

def process_scheduled_messages():
    res = es.search(index="mstore", body={"query": {"match_all": {}}})
    print("Got %d Hits:" % res['hits']['total'])
    # for hit in res['hits']['hits']:
    #     print("%(timestamp)s %(author)s: %(text)s" % hit["_source"])
    return res