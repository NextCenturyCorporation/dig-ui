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
        return !searchFieldsObject.isDate && !searchFieldsObject.isImage && !searchFieldsObject.isText;
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
        if(searchFieldsObject.isDate) {
          var dateProperties = createDateProperties(searchFieldsObject);
          dateConfig[dateProperties.start.key] = searchFieldsObject.key;
          dateConfig[dateProperties.end.key] = searchFieldsObject.key;
        }
      });
      return dateConfig;
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
        if(searchFieldsObject.isDate) {
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
        return !searchFieldsObject.isDate && !searchFieldsObject.isText;
      });
      var dateFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.isDate && !searchFieldsObject.isText;
      });
      if(dateFields.length && entityFields.length) {
        return entityFields.map(function(entityFieldsObject) {
          var object = {
            dateCollection: dateFields.reduce(function(dates, dateFieldsObject) {
              dates[dateFieldsObject.key] = _.cloneDeep(dateFieldsObject);
              return dates;
            }, {}),
            dateList: dateFields.reduce(function(dateChoices, dateFieldsObject) {
              dateChoices.push({
                key: dateFieldsObject.key,
                title: dateFieldsObject.title
              });
              return dateChoices;
            }, []),
            dateSelected: dateFields[0].key,
            entity: _.cloneDeep(entityFieldsObject),
            showDateMenu: dateFields.length > 1
          };
          return object;
        });
      }
      return [];
    },

    /**
     * Returns the image source for the image with the given ID using the given config.
     *
     * @param {String} id
     * @param {Object} esConfig
     * @return {String}
     */
    imageSrc: function(id, esConfig) {
      return (esConfig ? esConfig.imageUrlPrefix || '' : '') + id;
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
      var maxField = 0;
      var maxGroup = 0;

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
          field: fields[id].field || 'knowledge_graph.' + id + '.key',
          // The field order within a group.
          fieldOrder: fields[id].field_order,
          // The group for the facets, searchFieldsDialogConfig, and entity pages.
          group: fields[id].group_name || 'Other',
          // The group order.
          groupOrder: fields[id].group_order,
          // A polymer or fontawesome icon.
          icon: fields[id].icon || 'icons:text-format',
          // Either entity, text, or undefined.
          link: fields[id].show_as_link !== 'no' ? fields[id].show_as_link : undefined,
          // The queryField field.
          queryField: 'knowledge_graph.' + id + '.value',
          // Either header, detail, title, description, or undefined.
          result: fields[id].show_in_result !== 'no' ? fields[id].show_in_result : undefined,
          // Whether to show in the search fields.  Must be shown in the search fields if shown in the facets.
          search: fields[id].show_in_search || fields[id].show_in_facets || false,
          // The singular pretty name to show.
          title: fields[id].screen_label || 'Extraction',
          // The plural pretty name to show.
          titlePlural: fields[id].screen_label_plural || 'Extractions',
          // Either date, email, hyphenated, image, location, phone, string, or username.
          type: fields[id].type
        };
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        maxField = Math.max(maxField, searchFieldsObject.fieldOrder || 0);
        maxGroup = Math.max(maxGroup, searchFieldsObject.groupOrder || 0);

        return searchFieldsObject;
      }).map(function(searchFieldsObject) {
        if(searchFieldsObject.isDate) {
          searchFieldsObject.groupOrder = maxGroup + 1;
        }
        if(_.isUndefined(searchFieldsObject.groupOrder)) {
          searchFieldsObject.groupOrder = maxGroup + 1;
        }
        if(_.isUndefined(searchFieldsObject.fieldOrder)) {
          searchFieldsObject.fieldOrder = maxField + 1;
        }
        return searchFieldsObject;
      }).sort(function(a, b) {
        if(a.groupOrder < b.groupOrder) {
          return -1;
        }
        if(a.groupOrder > b.groupOrder) {
          return 1;
        }
        if(a.fieldOrder < b.fieldOrder) {
          return -1;
        }
        if(a.fieldOrder > b.fieldOrder) {
          return 1;
        }
        return a.title > b.title ? 1 : (a.title < b.title ? -1 : 0);
      });

      // Add the image field to show in the facets.
      searchFields.push(esConfig.imageField);

      // Add additional properties after the image field is added.
      searchFields.forEach(function(searchFieldsObject) {
        searchFieldsObject.isDate = (searchFieldsObject.type === 'date');
        searchFieldsObject.isEntity = (searchFieldsObject.link === 'entity');
        searchFieldsObject.isImage = (searchFieldsObject.type === 'image');
        searchFieldsObject.isLocation = (searchFieldsObject.type === 'location');
        searchFieldsObject.isText = (searchFieldsObject.result === 'title' || searchFieldsObject.result === 'description');
        searchFieldsObject.isUrl = (searchFieldsObject.type === 'tld' || searchFieldsObject.type === 'url');

        // The facet aggregation transform function.
        searchFieldsObject.facetTransform = createFacetTransform(searchFieldsObject.link, searchFieldsObject.type, searchFieldsObject.key);
        // Add style class (e.g. 'entity-grey').
        searchFieldsObject.styleClass = commonTransforms.getStyleClass(searchFieldsObject.color);
        // Properties for the date facets.
        searchFieldsObject.dateProperties = searchFieldsObject.isDate ? createDateProperties(searchFieldsObject) : {};
      });

      console.log('fields', searchFields);

      return searchFields;
    },

    /**
     * Returns the config for the search fields dialog.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    searchFieldsDialogConfig: function(searchFields) {
      var dialogConfig = [];

      searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.search && searchFieldsObject.isDate;
      }).forEach(function(searchFieldsObject) {
        var dateProperties = createDateProperties(searchFieldsObject);
        dialogConfig.push({
          type: 'date',
          name: searchFieldsObject.title,
          data: [
            dateProperties.start,
            dateProperties.end
          ]
        });
      });

      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.search && !searchFieldsObject.isDate && !searchFieldsObject.isImage) {
          var index = _.findIndex(dialogConfig, function(configObject) {
            return configObject.name === searchFieldsObject.group;
          });

          if(index < 0) {
            dialogConfig.push({
              name: searchFieldsObject.group,
              data: []
            });
            index = dialogConfig.length - 1;
          }

          dialogConfig[index].data.push({
            key: searchFieldsObject.key,
            field: searchFieldsObject.field,
            title: searchFieldsObject.title,
            enableNetworkExpansion: (searchFieldsObject.isEntity)
          });
        }
      });

      return dialogConfig;
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
        if(searchFieldsObject.isDate) {
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
        return searchFieldsObject.isDate && !searchFieldsObject.isText;
      });
      return index >= 0 ? searchFields[index].field : '';
    }
  };
});

