#!/usr/bin/env bash

echo "creating dig-profiles index at $1"
curl -XPUT $1/dig-profiles -d '
{
  "mappings" : {
    "profile": {
      "properties": {
        "username": {
          "type": "string",
          "index": "not_analyzed"
        },
        "blurImages": {
          "type": "boolean"
        },
        "emailAddress": {
          "type": "string",
          "index": "not_analyzed"
        },
        "notificationInterval": {
          "type": "string",
          "index": "not_analyzed"
        },
        "cases": {
          "properties": {
            "name": {
              "type": "string",
              "index": "not_analyzed"
            },
            "sendEmailAlert": {
              "type": "boolean"
            },
            "entities": {
              "properties": {
                "id": {
                  "type": "string"
                },
                "lastAutomatedRun": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "lastViewedByUser": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "notify": {
                  "type": "boolean"
                }
              }
            },
            "searches": {
              "properties": {
                "esState": {
                  "type": "string"
                },
                "lastAutomatedRun": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "lastViewedByUser": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "notify": {
                  "type": "boolean"
                },
                "uiState": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
}';
