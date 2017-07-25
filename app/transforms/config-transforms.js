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

  function createFacetTransform(linkType, fieldType, fieldId) {
    return function(response, key) {
      var aggregations = findAggregationsInResponse(response, key);
      return aggregations.reduce(function(data, bucket) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var count = bucket.doc_count;
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        var id = commonTransforms.getFacetsDataId(bucket.key, fieldType);
        if(id) {
          data.push({
            count: count,
            id: id,
            link: commonTransforms.getLink(bucket.key, linkType, fieldType, fieldId),
            text: commonTransforms.getFacetsDataText(bucket.key, fieldType)
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
        return searchFieldsObject.type !== 'date' && searchFieldsObject.type !== 'image' && searchFieldsObject.type !== 'location' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
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
        return searchFieldsObject.type === 'date' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    documentInfo: function(document, searchFields) {
      var searchKeys = searchFields.map(function(searchFieldsObject) {
        return searchFieldsObject.key;
      });

      var headerExtractions = (document.headerExtractions || []).filter(function(extraction) {
        return extraction.key !== '_domain';
      }).map(function(extraction) {
        var index = searchKeys.indexOf(extraction.key);
        var config = index >= 0 ? searchFields[index] : {};
        return {
          config: config,
          data: extraction.data
        };
      });

      var detailExtractions = (document.detailExtractions || []).map(function(extraction) {
        var index = searchKeys.indexOf(extraction.key);
        var config = index >= 0 ? searchFields[index] : {};
        return {
          config: config,
          data: extraction.data
        };
      });

      return headerExtractions.concat(detailExtractions);
    },

    fields: function(clientConfig) {
      return clientConfig.fields || {};
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
          field: searchFieldsObject.field,
          type: searchFieldsObject.type
        };
        return filtersBuilderConfig;
      }, {});
    },

    formatId: function(id) {
      return decodeURIComponent(id);
    },

    formatName: function(id, type) {
      return commonTransforms.getExtractionDataText(id, id, type);
    },

    histogramFields: function(searchFields) {
      var entityFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.link === 'entity' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      });
      var dateFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'date' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
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
        return searchFieldsObject.type === 'image' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    mapFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'location' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    pageConfig: function(searchFields, key) {
      var index = _.findIndex(searchFields, function(searchFieldsObject) {
        return searchFieldsObject.key === key;
      });
      return index >= 0 ? searchFields[index] : {};
    },

    searchFields: function(fields) {
      var searchFields =  _.keys(fields || {}).filter(function(id) {
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
        searchFieldsObject.facetTransform = createFacetTransform(searchFieldsObject.link, searchFieldsObject.type, searchFieldsObject.key);
        // Add style class (e.g. 'entity-grey').
        searchFieldsObject.styleClass = commonTransforms.getStyleClass(searchFieldsObject.color);

        // Add sort properties based on fields config to use in sorting the searchFields and searchFieldsDialogConfig.
        // Sort the searchFields in the order:  entity fields, extraction (non-entity) fields, title fields, description fields, website fields, date fields, image fields.
        searchFieldsObject.sort = {
          sortId: 2,
          sortType: 'extraction'
        };
        if(searchFieldsObject.type === 'date') {
          searchFieldsObject.sort = {
            sortId: 6,
            sortType: 'date'
          };
        } else if(searchFieldsObject.type === 'image') {
          searchFieldsObject.sort = {
            sortId: 7,
            sortType: 'image'
          };
        } else if(searchFieldsObject.link === 'entity') {
          searchFieldsObject.sort = {
            sortId: 1,
            sortType: 'entity'
          };
        } else if(searchFieldsObject.result === 'title') {
          searchFieldsObject.sort = {
            sortId: 3,
            sortType: 'document'
          };
        } else if(searchFieldsObject.result === 'description') {
          searchFieldsObject.sort = {
            sortId: 4,
            sortType: 'document'
          };
        } else if(searchFieldsObject.result === 'tld' || searchFieldsObject.key === 'website') {
          searchFieldsObject.sort = {
            sortId: 5,
            sortType: 'document'
          };
        }

        // Properties for the date facets.
        searchFieldsObject.dateProperties = fields[id].type === 'date' ? createDateProperties(searchFieldsObject) : {};

        return searchFieldsObject;
      }).sort(function(a, b) {
        if(a.sort.sortId < b.sort.sortId) {
          return -1;
        }
        if(a.sort.sortId > b.sort.sortId) {
          return 1;
        }
        return a.title > b.title ? 1 : (a.title < b.title ? -1 : 0);
      });

      return searchFields;
    },

    searchFieldsDialogConfig: function(searchFields) {
      var config = [];

      // Add the searchFields to the config in the order:  date fields, entity fields, extraction (non-entity) fields, document fields.
      searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.search && searchFieldsObject.sort.sortType === 'date';
      }).forEach(function(searchFieldsObject) {
        var dateProperties = createDateProperties(searchFieldsObject);
        config.push({
          name: searchFieldsObject.title,
          type: 'date',
          data: [
            dateProperties.start,
            dateProperties.end
          ]
        });
      });

      config.push({
        name: 'Entity',
        data: searchFields.filter(function(searchFieldsObject) {
          return searchFieldsObject.search && searchFieldsObject.sort.sortType === 'entity';
        }).map(function(searchFieldsObject) {
          return {
            key: searchFieldsObject.key,
            field: searchFieldsObject.field,
            title: searchFieldsObject.title
          };
        })
      });

      config.push({
        name: 'Extraction',
        data: searchFields.filter(function(searchFieldsObject) {
          return searchFieldsObject.search && searchFieldsObject.sort.sortType === 'extraction';
        }).map(function(searchFieldsObject) {
          return {
            key: searchFieldsObject.key,
            field: searchFieldsObject.field,
            title: searchFieldsObject.title
          };
        })
      });

      config.push({
        name: 'Document',
        data: searchFields.filter(function(searchFieldsObject) {
          return searchFieldsObject.search && searchFieldsObject.sort.sortType === 'document';
        }).map(function(searchFieldsObject) {
          return {
            key: searchFieldsObject.key,
            field: searchFieldsObject.field,
            title: searchFieldsObject.title
          };
        })
      });

      return config;
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
        return searchFieldsObject.type === 'date' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      });
      return index >= 0 ? searchFields[index].field : '';
    }
  };
});

