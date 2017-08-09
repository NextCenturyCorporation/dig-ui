#!/usr/bin/env bash

echo "creating dig-states index at $1"
curl -XPUT $1/dig-states -d '
{
  "mappings" : {
    "state" : {
      "properties" : {
        "id" : {
          "type" : "string",
          "index" : "not_analyzed"
        },
        "state" : {
          "type" : "string",
          "index" : "not_analyzed"
        }
      }
    }
  }
}
';
