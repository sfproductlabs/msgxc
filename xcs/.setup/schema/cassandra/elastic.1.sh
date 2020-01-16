#!/bin/bash

# setup
# 

curl -w "\n" -k -XDELETE "http://localhost:9200/msgxca"
curl -XPUT -H 'Content-Type: application/json' http://localhost:9200/msgxca -d'{}'

curl -w "\n" -k -XDELETE "http://localhost:9200/mxctriage"
curl -w "\n" -k -XDELETE "http://localhost:9200/mxcfailures"

# mxctriage - completed
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mxctriage/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mxctriage": {
            "properties" : {
                "mxcid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "completed": { "type": "date", "index": true, "cql_collection": "singleton" },
                "data": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "createdms": { "type": "long", "index": true, "cql_collection": "singleton" }
            }
        }
    }
}'

# curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mxccerts" -d '{
#     "settings" : { "keyspace" : "msgxc" },
#     "mappings": {
#         "mxccerts" : { "discover" : ".*" }
#     }
# }'

# "cql_struct": "frozen<map>",
curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/mxcfailures/" -d '{
    "settings" : { "keyspace" : "msgxc" },
    "mappings": {
        "mxcfailures": {
            "properties" : {
                "mxcid": { "type": "keyword", "index": true, "cql_collection": "singleton" },
                "died": { "type": "date", "index": true, "cql_collection": "singleton" },
                "retries": { "type": "integer", "index": true, "cql_collection": "singleton" },
                "mdevice": {
                    "type": "nested",
                    "include_in_parent": true,
                    "dynamic": "false",
                    "cql_collection": "singleton",
                    "cql_udt_name": "mxcdevice",
                    "properties": {
                        "mtype":    { "type": "keyword", "index": true,  "cql_collection": "singleton" },
                        "did":      { "type": "keyword", "index": true,  "cql_collection": "singleton" },
                        "updated":  { "type": "date", "index": true, "cql_collection": "singleton" }
                    }
                }
            }
        }
    }
}'


nodetool rebuild_index msgxc mxctriage elastic_mxctriage_idx
nodetool rebuild_index msgxc mxcfailures elastic_mxcfailures_idx

# OPTIONAL MERGE INDEXES
curl -w "\n" -k -H 'Content-Type: application/json'  -XPOST  "http://localhost:9200/_reindex" -d '{
  "source": {
    "index": ["mxctriage", "mxcfailures"]
  },
  "dest": {
    "index": "msgxca"
  }
}'



# Test
curl -XGET -H -k http://localhost:9200/msgxca/_search?pretty=true&q=*:*

curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/mxctriage/_search?pretty" -d '
{
  "query": {
    "bool":{
      "must_not":{
        "bool": {
          "must": [
            {"exists" : { "field" : "completed" }}
          ]
        }
      }
    }
  }
}'


curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/mxcfailures/_search?pretty" -d '
{
  "query": {
    "bool":{
      "must_not":{
        "bool": {
          "must": [
            {"exists" : { "field" : "died" }}
          ]
        }
      }
    }
  }
}'






