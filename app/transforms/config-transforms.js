/*
 * Copyright 2018 Next Century Corporation
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
        field: searchFieldsObject.field,
        icon: searchFieldsObject.icon,
        key: searchFieldsObject.key + '_start',
        styleClass: searchFieldsObject.styleClass,
        title: searchFieldsObject.title + ' Begin'
      },
      end: {
        field: searchFieldsObject.field,
        icon: searchFieldsObject.icon,
        key: searchFieldsObject.key + '_end',
        styleClass: searchFieldsObject.styleClass,
        title: searchFieldsObject.title + ' End'
      }
    };
  }

  function findAggregationsInResponse(response, property, isNetworkExpansion) {
    // If no search endpoint is defined, the response was sent directly from ES.
    if(!esConfig.searchEndpoint) {
      if(response && response.aggregations && response.aggregations[property]) {
        return (response.aggregations[property][property] ? response.aggregations[property][property].buckets : response.aggregations[property].buckets) || [];
      }
      return [];
    }

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

  function createFacetTransform(linkType, fieldType, fieldId, fieldStyleClass) {
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
            styleClass: fieldStyleClass,
            source: (fieldType === 'image' ? commonTransforms.getImageUrl(bucket.key, esConfig) : undefined),
            text: commonTransforms.getFacetsDataText(bucket.key, fieldType)
          });
        }
        return data;
      }, []);
    };
  }

  function createDateMenuConfig(searchFields) {
    var fields = searchFields.filter(function(searchFieldsObject) {
      return searchFieldsObject.isDate && !searchFieldsObject.isHidden;
    });
    return {
      fields: fields,
      show: fields.length > 1
    };
  }

  return {
    /**
     * Returns the fields for which to show aggregations and timelines in the entity pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    aggregationFields: function(searchFields) {
      var entityFields = searchFields.filter(function(searchFieldsObject) {
        return !searchFieldsObject.isDate && !searchFieldsObject.isHidden;
      });
      var dateMenu = createDateMenuConfig(searchFields);
      if(dateMenu.fields.length && entityFields.length) {
        // TODO Add config option.
        var showFieldAtIndex = Math.max(0, _.findIndex(entityFields, function(entityFieldsObject) {
          return entityFieldsObject.isUrl;
        }));
        return entityFields.map(function(entityFieldsObject, index) {
          return {
            dateCollection: dateMenu.fields.reduce(function(dates, dateFieldsObject) {
              dates[dateFieldsObject.key] = _.cloneDeep(dateFieldsObject);
              return dates;
            }, {}),
            dateList: dateMenu.fields,
            dateSelected: dateMenu.fields.length ? dateMenu.fields[0].key : undefined,
            entity: _.cloneDeep(entityFieldsObject),
            intervalSelected: 'week',
            loadData: index === showFieldAtIndex,
            showData: index === showFieldAtIndex,
            showDateMenu: dateMenu.show
          };
        });
      }
      return [];
    },

    /**
     * Returns the color map for the search fields.
     *
     * @param {Array} searchFields
     * @return {Object}
     */
    colorMap: function(searchFields) {
      return searchFields.reduce(function(colorMap, searchFieldsObject) {
        colorMap[searchFieldsObject.key] = searchFieldsObject.styleClass;
        return colorMap;
      }, {});
    },

    /**
     * Returns the fields for any date menu on the pages.
     *
     * @param {Object} searchFields
     * @return {Array}
     */
    dateMenu: function(searchFields) {
      // TODO Combine with dateFieldsToProperties?
      var menu = createDateMenuConfig(searchFields);
      menu.selected = menu.fields.length ? menu.fields[0].field : undefined;
      return menu;
    },

    /**
     * Returns the date fields mapped to the start and end properties needed for the other elements.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    dateFieldsToProperties: function(searchFields) {
      // TODO Combine with dateMenu?
      var dateFieldsToProperties = {};
      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.isDate) {
          dateFieldsToProperties[searchFieldsObject.field] = {
            key: searchFieldsObject.key,
            start: searchFieldsObject.dateProperties.start.key,
            end: searchFieldsObject.dateProperties.end.key
          };
        }
      });
      return dateFieldsToProperties;
    },

    /**
     * Returns the properties of the date fields mapped to the date keys needed for the other transforms.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    datePropertiesToKeys: function(searchFields) {
      var datePropertiesToKeys = {};
      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.isDate) {
          datePropertiesToKeys[searchFieldsObject.dateProperties.start.key] = searchFieldsObject.key;
          datePropertiesToKeys[searchFieldsObject.dateProperties.end.key] = searchFieldsObject.key;
        }
      });
      return datePropertiesToKeys;
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
     * Returns the config for the query-builder and filters-builder elements for the filterCollection on the entity page.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    filterCollectionBuildersConfig: function(searchFields) {
      return searchFields.reduce(function(config, searchFieldsObject) {
        config[searchFieldsObject.key] = {
          field: searchFieldsObject.field,
          type: searchFieldsObject.type
        };
        return config;
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
        var filters = filterCollection[searchFieldsObject.key];
        if(searchFieldsObject.isDate) {
          if(_.isArray(filters) && filters.length === 2) {
            terms['Begin ' + searchFieldsObject.title] = [commonTransforms.getFormattedDate(filters[0])];
            terms['End ' + searchFieldsObject.title] = [commonTransforms.getFormattedDate(filters[1])];
          }
        } else {
          // Use map to create a new array.
          terms[searchFieldsObject.title] = (filters || []).map(function(term) {
            return term;
          });
        }
        return terms;
      }, {});
    },

    /**
     * Returns a formatted pretty date string.
     *
     * @param {String} dateString
     * @return {String}
     */
    formatDate: function(dateString) {
      return commonTransforms.getFormattedDate(dateString);
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
     * Returns the list of free text search fields.
     *
     * @param {Array} searchFields
     * @return {Array}
     */
    freeTextSearchFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.freeText;
      });
    },

    /**
     * Returns the image source for the image with the given ID using the given config.
     *
     * @param {String} id
     * @param {Object} esConfig
     * @return {String}
     */
    imageSrc: function(id, esConfig) {
      return commonTransforms.getImageUrl(id, esConfig);
    },

    /**
     * Returns the list of text fields (strings) for the more-like-this query.
     *
     * @param {Array} searchFields
     * @return {Array}
     */
    moreLikeThisFields: function(searchFields) {
      return searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.result === 'description' || searchFieldsObject.result === 'title';
      }).map(function(searchFieldsObject) {
        return searchFieldsObject.queryField;
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
     * Returns the link for the result with the given ID.
     *
     * @param {String} id
     * @return {String}
     */
    resultLink: function(id) {
      return commonTransforms.getLink(id, 'result');
    },

    /**
     * Transforms the given fields from the client config object into the search fields config objects needed for the other transforms.
     *
     * @param {Object} fields
     * @return {Object}
     */
    searchFields: function(fields) {
      var maxGroup = 0;
      var groups = {};

      var searchFields =  _.keys(fields || {}).filter(function(id) {
        return !!fields[id].type;
      }).map(function(id) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var searchFieldsObject = {
          key: id,
          // Material design color.
          color: fields[id].color || 'grey',
          // The extraction field.
          extractionField: (fields[id].field ? ((fields[id].non_source ? '' : '_source.') + fields[id].field) : '') || '_source.knowledge_graph.' + id,
          // Whether to show in the facets.
          facets: fields[id].show_in_facets || false,
          // The aggregation field.
          field: fields[id].field || 'knowledge_graph.' + id + '.key',
          // The field order within a group.
          fieldOrder: fields[id].field_order,
          // Whether to search on the field with the keywords in the free text search (the input field in the search page navigation bar).
          freeText: fields[id].free_text_search || false,
          // The group for the facets, searchFieldsDialogConfig, and entity pages.
          group: fields[id].group_name,
          // The group order.
          groupOrder: fields[id].group_order,
          // A polymer or fontawesome icon.
          icon: fields[id].icon || 'icons:text-format',
          // Either entity, text (web URL), or undefined.
          link: fields[id].show_as_link !== 'no' ? fields[id].show_as_link : undefined,
          // The query field.
          queryField: fields[id].field || 'knowledge_graph.' + id + '.value',
          // Either header, detail, nested, series, title, description, or undefined.
          result: fields[id].show_in_result !== 'no' ? fields[id].show_in_result : undefined,
          // Whether to show in the search fields.  Must be shown in the search fields if shown in the facets.
          search: fields[id].show_in_search || fields[id].show_in_facets || false,
          // The singular pretty name to show.
          title: fields[id].screen_label || 'Extraction',
          // The plural pretty name to show.
          titlePlural: fields[id].screen_label_plural || 'Extractions',
          // Either date, email, hyphenated, image, kg_id, location, number, phone, string, type, or username.
          type: fields[id].type,
          // The width (number) to set for the extractions, if any.
          width: fields[id].width
        };
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

        maxGroup = searchFieldsObject.groupOrder >= 0 ? Math.max(maxGroup, searchFieldsObject.groupOrder + 1) : maxGroup;

        if(searchFieldsObject.group) {
          // Set the groupOrder of this field in this group.
          if(groups[searchFieldsObject.group] >= 0) {
            searchFieldsObject.groupOrder = groups[searchFieldsObject.group];
          }
          // Save the groupOrder of each field in this group.
          else if(searchFieldsObject.groupOrder >= 0) {
            groups[searchFieldsObject.group] = searchFieldsObject.groupOrder;
          }
        }

        return searchFieldsObject;
      }).map(function(searchFieldsObject) {
        if(searchFieldsObject.group && !searchFieldsObject.groupOrder && searchFieldsObject.groupOrder !== 0) {
          // Assign the next free group order to this group.
          if(!groups[searchFieldsObject.group] && groups[searchFieldsObject.group] !== 0) {
            groups[searchFieldsObject.group] = maxGroup++;
          }
          searchFieldsObject.groupOrder = groups[searchFieldsObject.group];
        }
        return searchFieldsObject;
      }).map(function(searchFieldsObject) {
        if(!searchFieldsObject.groupOrder && searchFieldsObject.groupOrder !== 0) {
          searchFieldsObject.groupOrder = maxGroup;
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
      if(esConfig.showImagesInFacets) {
        searchFields.push(esConfig.imageField);
      }

      // Add the webpage field for the user settings dialog config.
      searchFields.push(esConfig.webpageField);

      // Add additional properties after the image field is added.
      searchFields.forEach(function(searchFieldsObject) {
        searchFieldsObject.isDate = (searchFieldsObject.type === 'date');
        searchFieldsObject.isEntity = (searchFieldsObject.link === 'entity');
        searchFieldsObject.isHidden = !searchFieldsObject.facets && !searchFieldsObject.search && !(searchFieldsObject.link === 'entity' || searchFieldsObject.result === 'header' || searchFieldsObject.result === 'detail');
        searchFieldsObject.isImage = (searchFieldsObject.type === 'image');
        searchFieldsObject.isLocation = (searchFieldsObject.type === 'location');
        searchFieldsObject.isUrl = (searchFieldsObject.type === 'tld' || searchFieldsObject.type === 'url');

        // Add style class (e.g. 'entity-grey').
        searchFieldsObject.styleClass = commonTransforms.getStyleClass(searchFieldsObject.color);
        // The facet aggregation transform function.
        searchFieldsObject.facetTransform = createFacetTransform(searchFieldsObject.link, searchFieldsObject.type, searchFieldsObject.key, searchFieldsObject.styleClass);
        // Properties for the date facets.
        searchFieldsObject.dateProperties = searchFieldsObject.isDate ? createDateProperties(searchFieldsObject) : {};
      });

      console.log('fields', searchFields);

      return searchFields;
    },

    /**
     * Returns a collection of search field keys mapped to search field objects.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    searchFieldsCollection: function(searchFields) {
      return searchFields.reduce(function(object, searchFieldsObject) {
        object[searchFieldsObject.key] = {
          field: searchFieldsObject.isDate ? searchFieldsObject.field : searchFieldsObject.queryField,
          icon: searchFieldsObject.icon,
          link: commonTransforms.getLinkFunction(searchFieldsObject.link, searchFieldsObject.type, searchFieldsObject.key),
          name: searchFieldsObject.title,
          searchType: searchFieldsObject.freeText ? 'contains' : 'match',
          styleClass: searchFieldsObject.styleClass,
          type: searchFieldsObject.type
        };
        return object;
      }, {});
    },

    /**
     * Returns the config for the search fields dialog.
     *
     * @param {Object} searchFields
     * @return {Object}
     */
    searchFieldsDialogConfig: function(searchFields) {
      var dialogConfig = [];

      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.search) {
          if(searchFieldsObject.isDate) {
            dialogConfig.push({
              type: 'date',
              name: searchFieldsObject.title,
              data: [
                searchFieldsObject.dateProperties.start,
                searchFieldsObject.dateProperties.end
              ]
            });
          } else {
            var index = _.findIndex(dialogConfig, function(configObject) {
              return configObject.name === (searchFieldsObject.group || 'Other');
            });

            if(index < 0) {
              dialogConfig.push({
                type: searchFieldsObject.isImage ? 'image' : undefined,
                name: searchFieldsObject.group || 'Other',
                data: []
              });
              index = dialogConfig.length - 1;
            }

            dialogConfig[index].data.push({
              field: searchFieldsObject.field,
              icon: searchFieldsObject.icon,
              key: searchFieldsObject.key,
              styleClass: searchFieldsObject.styleClass,
              title: searchFieldsObject.title,
              type: searchFieldsObject.type,
              enableNetworkExpansion: esConfig.enableNetworkExpansion && !!searchFieldsObject.isEntity
            });
          }
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
        state[searchFieldsObject.key] = {};
        _.keys(searchParameters[searchFieldsObject.key] || {}).forEach(function(term) {
          if(searchParameters[searchFieldsObject.key][term].enabled) {
            state[searchFieldsObject.key][term] = searchParameters[searchFieldsObject.key][term];
          }
        });
        return state;
      }, {});
    },

    /**
     * Returns the search terms object to show in the state history dialog.
     *
     * @param {Object} parameters
     * @param {Object} searchFields
     * @return {Object}
     */
    searchTerms: function(parameters, searchFields) {
      return searchFields.reduce(function(terms, searchFieldsObject) {
        var parametersObject = parameters[searchFieldsObject.key];
        if(!_.isObject(parametersObject) && !!parametersObject) {
          terms[searchFieldsObject.title] = true;
        }

        if(_.isObject(parametersObject) && searchFieldsObject.isDate) {
          var startKey = searchFieldsObject.dateProperties.start.key;
          if(parametersObject[startKey] && parametersObject[startKey].enabled) {
            terms['Begin ' + searchFieldsObject.title] = [commonTransforms.getFormattedDate(parametersObject[startKey].text)];
          }
          var endKey = searchFieldsObject.dateProperties.end.key;
          if(parametersObject[endKey] && parametersObject[endKey].enabled) {
            terms['End ' + searchFieldsObject.title] = [commonTransforms.getFormattedDate(parametersObject[endKey].text)];
          }
        }

        if(_.isObject(parametersObject) && !searchFieldsObject.isDate) {
          terms[searchFieldsObject.title] = _.keys(parametersObject).reduce(function(list, term) {
            if(parametersObject[term].enabled) {
              list.push(parametersObject[term].text);
            }
            return list;
          }, []);
        }

        return terms;
      }, {});
    },

    /**
     * Returns the list of search fields sorted alphabetically.
     *
     * @param {Array} searchFields
     * @return {Array}
     */
    sortSearchFieldsAlphabetically: function(searchFields) {
      return _.cloneDeep(searchFields).sort(function(a, b) {
        return a.title < b.title ? -1 : (a.title > b.title ? 1 : 0);
      });
    }
  };
});

