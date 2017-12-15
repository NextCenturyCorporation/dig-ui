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
        "caseList": {
          "properties": {
            "name": {
              "type": "string",
              "index": "not_analyzed"
            },
            "sendEmailAlert": {
              "type": "boolean"
            },
            "entityList": {
              "properties": {
                "field": {
                  "type": "string",
                  "index": "not_analyzed"
                },
                "id": {
                  "type": "string",
                  "index": "not_analyzed"
                },
                "lastAutomatedRun": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "lastViewedByUser": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "name": {
                  "type": "string",
                  "index": "not_analyzed"
                },
                "notify": {
                  "type": "boolean"
                },
                "type": {
                  "type": "string",
                  "index": "not_analyzed"
                }
              }
            },
            "resultList": {
              "properties": {
                "id": {
                  "type": "string",
                  "index": "not_analyzed"
                },
                "lastAutomatedRun": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "lastViewedByUser": {
                  "type": "date",
                  "format" : "dateOptionalTime"
                },
                "name": {
                  "type": "string",
                  "index": "not_analyzed"
                },
                "notify": {
                  "type": "boolean"
                },
                "type": {
                  "type": "string",
                  "index": "not_analyzed"
                }
              }
            },
            "searchList": {
              "properties": {
                "esState": {
                  "type": "string",
                  "index": "not_analyzed"
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
                  "type": "string",
                  "index": "not_analyzed"
                }
              }
            }
          }
        }
      }
    }
  }
}';
