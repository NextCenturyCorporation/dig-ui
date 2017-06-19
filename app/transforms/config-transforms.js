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

  function createFacetTransform(link, type) {
    return function(response, key) {
      var aggregations = findAggregationsInResponse(response, key);
      return aggregations.reduce(function(data, bucket) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var count = bucket.doc_count;
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        var id = commonTransforms.getFacetsDataId(bucket.key, type);
        if(id) {
          data.push({
            count: count,
            id: id,
            link: commonTransforms.getLink(bucket.key, link, type),
            text: commonTransforms.getFacetsDataText(bucket.key, type)
          });
        }
        return data;
      }, []);
    };
  }

  return {
    aggregationFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        // Dates will be shown in the histograms, images in the galleries, and locations in the maps.
        return searchFieldsObject.type !== 'date' && searchFieldsObject.type !== 'image' && searchFieldsObject.type !== 'location';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

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

    dateFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'date';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    entityPageConfig: function(searchFields, key) {
      var index = _.findIndex(searchFields, function(searchFieldsObject) {
        return searchFieldsObject.key === key;
      });
      return index >= 0 ? searchFields[index] : {};
    },

    filterCollection: function(searchFields) {
      return searchFields.reduce(function(filterCollection, searchFieldsObject) {
        filterCollection[searchFieldsObject.key] = [];
        return filterCollection;
      }, {});
    },

    filtersBuilderConfig: function(searchFields) {
      return searchFields.reduce(function(filtersBuilderConfig, searchFieldsObject) {
        filtersBuilderConfig[searchFieldsObject.key] = {
          field: searchFieldsObject.field
        };
        return filtersBuilderConfig;
      }, {});
    },

    histogramFields: function(searchFields) {
      var entityFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.link === 'entity';
      });
      var dateFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'date';
      });
      var histogramFields = dateFields.reduce(function(fields, dateFieldsObject) {
        return fields.concat(entityFields.map(function(entityFieldsObject) {
          return {
            date: dateFieldsObject,
            entity: entityFieldsObject
          };
        }));
      }, []);
      return histogramFields.map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    imageFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'image';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    mapFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'location';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    searchFields: function(fields) {
      return _.keys(fields || {}).filter(function(id) {
        return !!fields[id].type;
      }).map(function(id) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var searchFieldsObject = {
          key: id,
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
          // Either date, email, hyphenated, image, location, phone, string, or username.
          type: fields[id].type
        };
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        // The facet aggregation transform function.
        searchFieldsObject.facetTransform = createFacetTransform(searchFieldsObject.link, searchFieldsObject.type);
        // Add style class (e.g. 'entity-grey').
        searchFieldsObject.styleClass = commonTransforms.getStyleClass(searchFieldsObject.color);

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
    },

    sortField: function(searchFields) {
      var index = _.findIndex(searchFields, function(searchFieldsObject) {
        return searchFieldsObject.type === 'date';
      });
      return index >= 0 ? searchFields[index].field : '';
    }
  };
});

