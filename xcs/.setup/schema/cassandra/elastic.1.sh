#!/bin/bash

# setup
# curl -w "\n" -k -XDELETE "http://localhost:9200/msgxc"
curl -w "\n" -k -XPUT "http://localhost:9200/msgxc"

# mxctriage - completed
curl -w "\n" -k -H 'Content-Type: application/json' -XPUT "http://localhost:9200/msgxc/_mapping/updates" -d '{
  "updates": {
    "properties" : {
      "id":              { "type": "keyword", "index": true, "cql_collection": "singleton" }
    }
  }
}'

curl -w "\n" -k -H 'Content-Type: application/json'  -XPUT  "http://localhost:9200/msgxc/_mapping/mxccerts" -d '{
  "mxccerts": {
    "properties" : {
      "certid":              { "type": "keyword", "index": true, "cql_collection": "singleton" }
    }
  }
}'

#   "preview_image_url": { "type": "keyword", "index": false, "cql_collection": "singleton" },
    #   "expert_slugs":      { "type": "keyword", "index": true, "cql_collection": "set" },
    #   "categories":        { "type": "keyword", "index": true, "cql_collection": "set" },
    #   "published":         { "type": "date",    "index": true, "cql_collection": "singleton" },
    #   "slug":              { "type": "keyword", "index": true, "cql_collection": "singleton", "normalizer": "custom_sort_normalizer" },
    #   "description":       { "type": "keyword", "index": true, "cql_collection": "singleton" },
    #   "short_description": { "type": "keyword", "index": true, "cql_collection": "singleton" },
    #   "visibility":        { "type": "keyword", "index": true, "cql_collection": "singleton" },
    #   "sections": {
    #     "type": "nested",
    #     "include_in_parent": true,
    #     "dynamic": "false",
    #     "cql_struct": "frozen<map>",
    #     "cql_collection": "singleton",
    #     "cql_udt_name": "file",
    #     "properties": {
    #       "title":    { "type": "keyword", "index": true,  "cql_collection": "singleton" },
    #       "subtitle": { "type": "keyword", "index": true,  "cql_collection": "singleton" },
    #       "name":     { "type": "keyword", "index": false, "cql_collection": "singleton" },
    #       "type":     { "type": "keyword", "index": false, "cql_collection": "singleton" }
    #     }
    #   },
    #   "product_id":        { "type": "keyword", "index": false, "cql_collection": "singleton" }

# Test
curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/msgxc/mxctriage/_search?pretty" -d '
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

# mxcfailures - died
curl -XPUT -H 'Content-Type: application/json' "http://localhost:9200/msgxc/_mapping/mxcfailures" -d '{
        "discover" : ".*"    
}'

# Test
curl -XGET -H 'Content-Type: application/json' "http://localhost:9200/msgxc/mxcfailed/_search?pretty" -d '
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


nodetool rebuild_index msgxc mxctriage elastic_mxctriage_idx
nodetool rebuild_index msgxc mxcfailures elastic_mxcfailures_idx