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

var configTransforms = (function(_, commonTransforms, esConfig) {
  function createDateProperties(searchFieldsObject) {
    return {
      start: {
        key: searchFieldsObject.key + '_start',
        field: searchFieldsObject.field,
        title: searchFieldsObject.title + ' Start'
      },
      end: {
        key: searchFieldsObject.key + '_end',
        field: searchFieldsObject.field,
        title: searchFieldsObject.title + ' End'
      }
    };
  }

  function findAggregationsInResponse(response, property, isNetworkExpansion) {
    if(isNetworkExpansion) {
      if(response && response.length && response[0].result && response[0].result.length > 1 && response[0].result[1].aggregations && response[0].result[1].aggregations['?' + property]) {
        return response[0].result[1].aggregations['?' + property].buckets || [];
      }
    } else {
      if(response && response.length && response[0].result && response[0].result.aggregations && response[0].result.aggregations['?' + property]) {
        return response[0].result.aggregations['?' + property].buckets || [];
      }
    }
    return [];
  }

  function createFacetTransform(linkType, fieldType, fieldId) {
    return function(response, config) {
      var aggregations = findAggregationsInResponse(response, config.name, config.isNetworkExpansion);
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
    /**
     * Returns the fields for which to show aggregations in entity pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    aggregationFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        // Dates will be shown in the histograms, images in the galleries, and locations in the maps.
        return searchFieldsObject.type !== 'date' && searchFieldsObject.type !== 'image' && searchFieldsObject.type !== 'location' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    /**
     * Returns the config for the date fields needed for the other transforms.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
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

    /**
     * Returns the fields for which to show date facets in the search page and timelines in the entity pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    dateFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'date' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    /**
     * Initializes an Object with filter subproperties for the facets on the entity page
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    entityFilters: function(searchFields) {
      var filters = {};

      searchFields.forEach(function(element) {
        filters[element.key] = {};
      });
      return filters;
    },

    /**
     * Returns the fields in the given client config object.
     *
     * @param {Object} clientConfig
     * @return {Object}
     */
    fields: function(clientConfig) {
      return clientConfig.fields || {};
    },

    /**
     * Returns a new filter collection object for the entity pages.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    filterCollection: function(searchFields) {
      return searchFields.reduce(function(filterCollection, searchFieldsObject) {
        filterCollection[searchFieldsObject.key] = [];
        return filterCollection;
      }, {});
    },

    /**
     * Returns the config for the filters-builder element.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    filtersBuilderConfig: function(searchFields) {
      return searchFields.reduce(function(filtersBuilderConfig, searchFieldsObject) {
        filtersBuilderConfig[searchFieldsObject.key] = {
          field: searchFieldsObject.field,
          type: searchFieldsObject.type
        };
        return filtersBuilderConfig;
      }, {});
    },

    /**
     * Returns the filter state object.
     *
     * @param {Object} filterCollection
     * @param {Object} searchFields
     * @return {Object}
     */
    filterState: function(filterCollection, searchFields) {
      return searchFields.reduce(function(state, searchFieldsObject) {
        state[searchFieldsObject.key] = filterCollection[searchFieldsObject.key] || [];
        return state;
      }, {});
    },

    /**
     * Returns the filter terms object to show in the state history dialog.
     *
     * @param {Object} filterCollection
     * @param {Object} searchFields
     * @return {Object}
     */
    filterTerms: function(filterCollection, searchFields) {
      return searchFields.reduce(function(terms, searchFieldsObject) {
        var filterCollectionObject = filterCollection[searchFieldsObject.key];
        if(searchFieldsObject.type === 'date') {
          if(_.isArray(filterCollectionObject) && filterCollectionObject.length === 2) {
            terms['Start ' + searchFieldsObject.title] = [filterCollectionObject[0]];
            terms['End ' + searchFieldsObject.title] = [filterCollectionObject[1]];
          }
        } else {
          // Use map to create a new array.
          terms[searchFieldsObject.title] = filterCollectionObject.map(function(term) {
            return term;
          });
        }
        return terms;
      }, {});
    },

    /**
     * Returns a formatted ID.
     *
     * @param {String} id
     * @return {String}
     */
    formatId: function(id) {
      return decodeURIComponent(id);
    },

    /**
     * Returns a formatted pretty name.
     *
     * @param {String} id
     * @param {String} type
     * @return {String}
     */
    formatName: function(id, type) {
      return commonTransforms.getExtractionDataText(id, id, type);
    },

    /**
     * Returns the fields for which to show histograms (timelines) in the entity pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
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

    /**
     * Returns the fields for which to show maps in the entity pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    mapFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.type === 'location' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      }).map(function(searchFieldsObject) {
        return _.cloneDeep(searchFieldsObject);
      });
    },

    /**
     * Returns a new network expansion parameters object for the search page.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    networkExpansionParameters: function(searchFields) {
      return searchFields.reduce(function(searchParameters, searchFieldsObject) {
        searchParameters[searchFieldsObject.key] = false;
        return searchParameters;
      }, {});
    },

    /**
     * Returns the config object from the search fields for the entity page with the given key.
     *
     * @param {Object} searchFields
     * @param {String} key
     * @return {Object}
     */
    pageConfig: function(searchFields, key) {
      var index = _.findIndex(searchFields, function(searchFieldsObject) {
        return searchFieldsObject.key === key;
      });
      return index >= 0 ? searchFields[index] : {};
    },

    /**
     * Transforms the given fields from the client config object into the search fields config objects needed for the other transforms.
     *
     * @param {Object} fields
     * @return {Object}
     */
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
          // The group for the searchFieldsDialogConfig.
          group: fields[id].group_name,
          // A polymer or fontawesome icon.
          icon: fields[id].icon || 'icons:text-format',
          // Either entity, text, or undefined.
          link: fields[id].show_as_link !== 'no' ? fields[id].show_as_link : undefined,
          // The queryField field.
          queryField: 'knowledge_graph.' + id + '.value',
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

        // Sort for the facets and the search fields dialog.
        if(searchFieldsObject.type === 'date') {
          searchFieldsObject.sort = 6;
        } else if(searchFieldsObject.result === 'title') {
          searchFieldsObject.sort = 2;
          searchFieldsObject.group = searchFieldsObject.group || 'Document';
        } else if(searchFieldsObject.result === 'description') {
          searchFieldsObject.sort = 3;
          searchFieldsObject.group = searchFieldsObject.group || 'Document';
        } else if(searchFieldsObject.result === 'tld' || searchFieldsObject.key === 'website') {
          searchFieldsObject.sort = 4;
          searchFieldsObject.group = searchFieldsObject.group || 'Document';
        } else if(searchFieldsObject.key === 'url') {
          searchFieldsObject.sort = 5;
          searchFieldsObject.group = searchFieldsObject.group || 'Document';
        } else {
          searchFieldsObject.sort = 1;
          searchFieldsObject.group = searchFieldsObject.group || (searchFieldsObject.link === 'entity' ? 'Entity' : 'Extraction');
        }

        // Properties for the date facets.
        searchFieldsObject.dateProperties = fields[id].type === 'date' ? createDateProperties(searchFieldsObject) : {};

        return searchFieldsObject;
      }).sort(function(a, b) {
        if(a.sort < b.sort) {
          return -1;
        }
        if(a.sort > b.sort) {
          return 1;
        }
        return a.title > b.title ? 1 : (a.title < b.title ? -1 : 0);
      });

      // Add the image field to show in the facets.
      searchFields.push(esConfig.imageField);

      console.log('searchFields', searchFields);

      return searchFields;
    },

    /**
     * Returns the config for the search fields dialog.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    searchFieldsDialogConfig: function(searchFields) {
      var config = [];

      searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.search && searchFieldsObject.type === 'date';
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

      var groups = searchFields.reduce(function(groups, searchFieldsObject) {
        if(searchFieldsObject.search && searchFieldsObject.type !== 'date' && searchFieldsObject.type !== 'image') {
          groups[searchFieldsObject.group] = groups[searchFieldsObject.group] || [];
          groups[searchFieldsObject.group].push(searchFieldsObject);
        }
        return groups;
      }, {});

      _.keys(groups).sort().forEach(function(group) {
        config.push({
          name: group,
          data: groups[group].map(function(searchFieldsObject) {
            return {
              key: searchFieldsObject.key,
              field: searchFieldsObject.field,
              title: searchFieldsObject.title,
              enableNetworkExpansion: (searchFieldsObject.link === 'entity')
            };
          })
        });
      });

      return config;
    },

    /**
     * Returns the search fields keys.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    searchKeys: function(searchFields) {
      return searchFields.map(function(searchFieldsObject) {
        return searchFieldsObject.key;
      });
    },

    /**
     * Returns a new search parameters object for the search page.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    searchParameters: function(searchFields) {
      return searchFields.reduce(function(searchParameters, searchFieldsObject) {
        searchParameters[searchFieldsObject.key] = {};
        return searchParameters;
      }, {});
    },

    /**
     * Returns the search state object.
     *
     * @param {Object} searchParameters
     * @param {Object} searchFields
     * @return {Object}
     */
    searchState: function(searchParameters, searchFields) {
      return searchFields.reduce(function(state, searchFieldsObject) {
        state[searchFieldsObject.key] = searchParameters[searchFieldsObject.key] || {};
        return state;
      }, {});
    },

    /**
     * Returns the search terms object to show in the state history dialog.
     *
     * @param {Object} searchParameters
     * @param {Object} searchFields
     * @return {Object}
     */
    searchTerms: function(searchParameters, searchFields) {
      return searchFields.reduce(function(terms, searchFieldsObject) {
        var searchParametersObject = searchParameters[searchFieldsObject.key];
        if(searchFieldsObject.type === 'date') {
          var startKey = searchFieldsObject.dateProperties.start.key;
          if(searchParametersObject[startKey] && searchParametersObject[startKey].enabled) {
            terms['Start ' + searchFieldsObject.title] = [searchParametersObject[startKey].text];
          }
          var endKey = searchFieldsObject.dateProperties.end.key;
          if(searchParametersObject[endKey] && searchParametersObject[endKey].enabled) {
            terms['End ' + searchFieldsObject.title] = [searchParametersObject[endKey].text];
          }
        } else {
          terms[searchFieldsObject.title] = _.keys(searchParametersObject).reduce(function(list, term) {
            if(searchParametersObject[term].enabled) {
              list.push(searchParametersObject[term].text);
            }
            return list;
          }, []);
        }
        return terms;
      }, {});
    },

    /**
     * Returns the date sort field.
     *
     * @param {Object} searchFields
     * @return {String}
     */
    sortField: function(searchFields) {
      var index = _.findIndex(searchFields, function(searchFieldsObject) {
        return searchFieldsObject.type === 'date' && searchFieldsObject.result !== 'title' && searchFieldsObject.result !== 'description';
      });
      return index >= 0 ? searchFields[index].field : '';
    }
  };
});

