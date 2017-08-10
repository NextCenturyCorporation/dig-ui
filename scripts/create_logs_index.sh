#!/usr/bin/env bash

echo "creating dig-logs index at $1"
curl -XPUT $1/dig-logs -d '
{
  "mappings" : {
    "log" : {
      "properties" : {
        "user" : {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "type" : {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "host" : {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "data" : {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "date": {
          "type": "date",
          "format" : "dateOptionalTime"
        }
      }
    }
  }
}
';
