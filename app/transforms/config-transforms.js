/*
 * Copyright 2017 Next Century Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* exported configTransforms */
/* jshint camelcase:false */

var configTransforms = (function(_, commonTransforms) {
  function createDateProperties(searchFieldsObject) {
    return {
      start: {
        key: searchFieldsObject.key + '_start',
        field: searchFieldsObject.field,
        title: searchFieldsObject.title + ' From',
        dateIdentifier: 'start'
      },
      end: {
        key: searchFieldsObject.key + '_end',
        field: searchFieldsObject.field,
        title: searchFieldsObject.title + ' To',
        dateIdentifier: 'end'
      }
    };
  }

  function findAggregationsInResponse(response, property) {
    if(response && response.length && response[0].result && response[0].result.aggregations && response[0].result.aggregations['?' + property]) {
      return response[0].result.aggregations['?' + property].buckets || [];
    }
    return [];
  }

  function createAggregationTransform(searchFieldsObject) {
    return function(response, key) {
      var aggregations = findAggregationsInResponse(response, key);
      return aggregations.reduce(function(data, bucket) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var count = bucket.doc_count;
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        var id = commonTransforms.getAggregatedDataId(bucket.key, searchFieldsObject.type);
        if(id) {
          data.push({
            count: count,
            id: id,
            link: commonTransforms.getLink(bucket.key, searchFieldsObject.link, searchFieldsObject.type),
            text: commonTransforms.getAggregatedDataText(bucket.key, searchFieldsObject.type)
          });
        }
        return data;
      }, []);
    };
  }

  return {
    dateConfig: function(searchFields) {
      var dateConfig = {};
      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.type === 'date') {
          var dateProperties = createDateProperties(searchFieldsObject);
          dateConfig[dateProperties.start.key] = searchFieldsObject.key;
          dateConfig[dateProperties.end.key] = searchFieldsObject.key;
        }
      });
      return dateConfig;
    },

    searchFields: function(fields) {
      return _.keys(fields || {}).filter(function(id) {
        return !!fields[id].type;
      }).map(function(id) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var searchFieldsObject = {
          key: id,
          // The aggregation transform function.
          aggregationTransform: createAggregationTransform(fields[id]),
          // Material design color.
          color: fields[id].color || 'grey',
          // Whether to show in the facets.
          facets: fields[id].show_in_facets || false,
          // The aggregation field.
          field: 'knowledge_graph.' + id + '.key',
          // A polymer or fontawesome icon.
          icon: fields[id].icon || 'icons:text-format',
          // Either entity, text, or undefined.
          link: fields[id].show_as_link !== 'no' ? fields[id].show_as_link : undefined,
          // Either header, detail, title, description, or undefined.
          result: fields[id].show_in_result !== 'no' ? fields[id].show_in_result : undefined,
          // Whether to show in the search fields.
          search: fields[id].show_in_search || false,
          // The singular pretty name to show.
          title: fields[id].screen_label || 'Extraction',
          // The plural pretty name to show.
          titlePlural: fields[id].screen_label_plural || 'Extractions',
          // Either date, email, hyphenated, location, phone, string, or username.
          type: fields[id].type
        };
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        // Properties for the date facets.
        searchFieldsObject.dateProperties = fields[id].type === 'date' ? createDateProperties(searchFieldsObject) : {};
        return searchFieldsObject;
      }).sort(function(a, b) {
        if(a.type === 'date' && b.type !== 'date') {
          return -1;
        }
        if(a.type !== 'date' && b.type === 'date') {
          return 1;
        }
        if(a.link === 'entity' && b.link !== 'entity') {
          return -1;
        }
        if(a.link !== 'entity' && b.link === 'entity') {
          return 1;
        }
        return a.titlePlural > b.titlePlural ? 1 : (a.titlePlural < b.titlePlural ? -1 : 0);
      });
    },

    searchFieldsDialogConfig: function(searchFields) {
      var config = [];
      var fields = [];

      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.type === 'date') {
          var dateProperties = createDateProperties(searchFieldsObject);
          config.push({
            name: searchFieldsObject.titlePlural,
            type: 'date',
            data: [
              dateProperties.start,
              dateProperties.end
            ]
          });
        } else {
          fields.push({
            key: searchFieldsObject.key,
            field: searchFieldsObject.field,
            title: searchFieldsObject.title
          });
        }
      });

      return config.concat([{
        name: 'Fields',
        data: fields
      }]);
    },

    searchKeys: function(searchFields) {
      return searchFields.map(function(searchFieldsObject) {
        return searchFieldsObject.key;
      });
    },

    searchParameters: function(searchFields) {
      return searchFields.reduce(function(searchParameters, searchFieldsObject) {
        searchParameters[searchFieldsObject.key] = {};
        return searchParameters;
      }, {});
    }
  };
});

