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

/* exported entityTransforms */
/* jshint camelcase:false */

var entityTransforms = (function(_, commonTransforms, esConfig) {
  function getExtraction(item, config, index, confidence) {
    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    var count = item.doc_count;
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
    var extraction = {
      confidence: confidence,
      count: count,
      id: commonTransforms.getExtractionDataId(item.key, item.value, config.type),
      icon: config.icon,
      link: commonTransforms.getLink(item.key, config.link, config.type, config.key),
      provenances: [],
      styleClass: config.styleClass,
      text: commonTransforms.getExtractionDataText(item.key, item.value, config.type, (index || 0)),
      type: config.key,
      width: config.width
    };

    if(item.provenance && item.provenance.length) {
      extraction.provenances = item.provenance.map(function(provenance) {
        return {
          method: provenance.method + (provenance.source && provenance.source.segment ? ' from ' + provenance.source.segment : ''),
          text: provenance.source && provenance.source.context ? provenance.source.context.text : 'Not Available'
        };
      });
      // Set the confidence to zero if it is undefined.
      extraction.confidence = extraction.confidence || 0;
    }

    if(config.type !== 'url') {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var userClassification = '' + item.human_annotation;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      extraction.classifications = {
        type: config.key,
        user: (userClassification === '1' ? 'positive' : (userClassification === '0' ? 'negative' : undefined))
      };
    }

    if(config.type === 'location') {
      var locationData = commonTransforms.getLocationDataFromKey(item.key);
      extraction.latitude = locationData.latitude;
      extraction.longitude = locationData.longitude;
      extraction.text = locationData.text;
      extraction.textAndCountry = locationData.text + (locationData.country ? (', ' + locationData.country) : '');
    }

    if(config.type === 'image') {
      extraction.downloadSource = (esConfig ? '/' + esConfig.downloadImageUrl || '' : '') + '/' + encodeURIComponent(item.key);
      extraction.source = commonTransforms.getImageUrl(item.key, esConfig);
    }

    extraction.textAndCount = extraction.text + (extraction.count ? (' (' + extraction.count + ')') : '');
    return extraction;
  }

  function getExtractionsFromList(extractionList, config) {
    var extractionData = extractionList.map(function(item, index) {
      var confidence = _.isUndefined(item.confidence) ? undefined : (Math.round(Math.min(item.confidence, 1) * 10000.0) / 100.0);
      return getExtraction(item, config, index, confidence);
    });
    return extractionData.filter(commonTransforms.getExtractionFilterFunction(config.type));
  }

  function getExtractionsFromResult(result, path, config) {
    var data = _.get(result, path, []);
    return getExtractionsFromList((_.isArray(data) ? data : [data]), config);
  }

  function getHighlightPathList(itemId, itemText, result, type, highlights) {
    // The highlights property maps search terms to unique IDs.
    // The result.matched_queries property lists highlights in the format <id>:<path>:<text>

    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    var matchedQueries = result.matched_queries;
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

    var wordsOrPhrases = [];
    if(type === 'location') {
      // Add the city name.
      wordsOrPhrases = [itemId.substring(0, itemId.indexOf(':'))];
    } else if(type === 'phone') {
      // Add the phone without punctuation.
      wordsOrPhrases = [itemText, itemText.replace(/\W/g, '')];
    } else {
      // Add the full text and all single words in the text.  Remove all punctuation so we can separate the words.
      wordsOrPhrases = [itemText].concat(itemText.replace(/\W/g, ' ').split(' '));
    }

    var highlightPaths = {};

    if(matchedQueries && matchedQueries.length && highlights) {
      wordsOrPhrases.forEach(function(wordOrPhrase) {
        // If a highlight mapping exists for the word or phrase, check the matched queries.
        if(highlights[wordOrPhrase]) {
          return matchedQueries.filter(function(path) {
            return _.startsWith(path, highlights[wordOrPhrase]);
          }).map(function(path) {
            // Return the path in the matched queries.
            return path.split(':')[1];
          }).forEach(function(path) {
            highlightPaths[path] = true;
          });
        }
      });
    }

    return _.keys(highlightPaths);
  }

  function checkHighlightedText(text, type) {
    // TODO Do we have to hard-code <em> or can we make it a config variable?
    // Ignore partial matches for emails and websites.
    if((type === 'email' || type === 'website') && (!_.startsWith(text, '<em>') || !_.endsWith(text, '</em>'))) {
      return false;
    }

    var output = text;

    // Usernames are formatted "<website> <username>".  Ignore matches on the <website>.
    if(type === 'username') {
      output = output.indexOf(' ') ? output.substring(output.indexOf(' ') + 1) : output;
    }

    // Return whether the given text has both start and end tags.
    return output.indexOf('<em>') >= 0 && output.indexOf('</em>') >= 0 ? !!(output.replace(/<\/?em\>/g, '')) : false;
  }

  function getHighlightedText(itemId, itemText, result, type, highlights) {
    // Get the paths from the highlight mapping to explore in the result highlights specifically for the given item.
    var pathList = getHighlightPathList(('' + itemId).toLowerCase(), ('' + itemText).toLowerCase(), result, type, highlights);
    var textList = [];
    if(result.highlight && pathList.length) {
      // Find the highlighted text in the result highlights using a highlights path.  Use the first because they are all the same.
      pathList.forEach(function(path) {
        (result.highlight[path] || []).forEach(function(text) {
          if(checkHighlightedText(text)) {
            textList.push(text);
          }
        });
      });
    }
    return textList.length ? textList[0] : undefined;
  }

  function getHighlightedExtractionObjectFromResult(result, config, highlights) {
    var data = getExtractionsFromResult(result, '_source.' + config.extractionField, config);
    if(highlights) {
      data = data.map(function(item) {
        // The highlight in the extraction object is a boolean (YES or NO).
        item.highlight = !!(getHighlightedText(item.id, item.text, result, config.type, highlights[config.key]));
        return item;
      });
    }
    return {
      data: data,
      isDate: config.isDate,
      isUrl: config.isUrl,
      key: config.key,
      name: data.length === 1 ? config.title : config.titlePlural,
      type: config.type
    };
  }

  function getResultTags(result, path) {
    var tags = _.get(result, path, {});
    return _.keys(tags).reduce(function(object, tag) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var userClassification = '' + tags[tag].human_annotation;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      object[tag] = {
        type: 'result',
        user: (userClassification === '1' ? 'positive' : (userClassification === '0' ? 'negative' : undefined))
      };
      return object;
    }, {});
  }

  function getTitleOrDescription(type, searchFields, result, highlights) {
    var searchFieldsObject = _.find(searchFields, function(object) {
      return object.result === type;
    });

    var returnObject = {
      text: '',
      highlight: ''
    };

    // Use the extraction data from the field in the searchFieldsObject if possible.  This overwrites the default.
    if(searchFieldsObject) {
      var extraction = _.get(result, '_source.' + searchFieldsObject.extractionField);
      if(_.isObject(extraction) || _.isArray(extraction)) {
        if(_.isObject(extraction)) {
          returnObject.text = extraction.value;
        }
        if(_.isArray(extraction)) {
          returnObject.text = extraction.map(function(object) {
            return object.value;
          }).join(' ');
        }
        if(highlights) {
          var highlight = getHighlightedText(returnObject.text, returnObject.text, result, type, highlights[searchFieldsObject.key]);
          returnObject.highlight = highlight || returnObject.highlight || returnObject.text;
        }
      }
    }

    // Change newlines to breaks and remove repeat newlines.
    returnObject.text = (returnObject.text || '').replace(/[\n\r][\s]*/g, '<br/>');
    returnObject.highlight = (returnObject.highlight || '').replace(/[\n\r][\s]*/g, '<br/>');

    if(type === 'title') {
      // Remove breaks from titles.
      returnObject.text = (returnObject.text || '').replace(/<br\/>/g, '');
      returnObject.highlight = (returnObject.highlight || '').replace(/<br\/>/g, '');
    }

    return returnObject;
  }

  /**
   * Creates and returns the transformed result object.
   *
   * @param {Object} result The elasticsearch result object.
   * @param {Array} searchFields The list of search fields config objects.
   * @param {String} icon
   * @param {String} name
   * @param {String} styleClass
   * @param {Object} highlights The fields mapped to the highlights returned by the search.  An object that maps search fields to objects that map search terms to unique IDs.  For example:
   * {
   *   email: {
   *     abc@gmail.com: 123
   *   },
   *   phone: {
   *     1234567890: 456,
   *     9876543210: 789
   *   }
   * }
   * @return {Object}
   */
  function createResultObject(result, searchFields, icon, name, styleClass, highlights) {
    var id = _.get(result, '_source.doc_id');

    if(!id) {
      return undefined;
    }

    var crawlTimestamp = commonTransforms.getFormattedDate(_.get(result, '_source.@timestamp'));
    if(crawlTimestamp === 'None') {
      crawlTimestamp = commonTransforms.getFormattedDate(_.get(result, '_source.timestamp'));
    }
    var esDataEndpoint = (esConfig && esConfig.esDataEndpoint ? (esConfig.esDataEndpoint + id) : undefined);

    var title = getTitleOrDescription('title', searchFields, result, highlights);
    var description = getTitleOrDescription('description', searchFields, result, highlights);

    var resultObject = {
      id: id,
      url: _.get(result, '_source.url'),
      crawlTimestamp: (crawlTimestamp === 'None' ? 'Unknown' : crawlTimestamp),
      type: 'result',
      icon: icon,
      link: commonTransforms.getLink(id, 'result'),
      name: name,
      styleClass: styleClass,
      tags: getResultTags(result, '_source.knowledge_graph._tags'),
      esData: esDataEndpoint,
      title: title.text,
      description: description.text || 'None',
      headerExtractions: [],
      detailExtractions: [],
      nestedExtractions: [],
      details: []
    };

    resultObject.highlightedText = title.highlight || resultObject.title;

    var finalizeExtractionFunction = function(extractionObject, index) {
      extractionObject.data = extractionObject.data.sort(function(a, b) {
        if(extractionObject.type === 'date') {
          return new Date(a.id) - new Date(b.id);
        }
        return ('' + a.text).toLowerCase() - ('' + b.text).toLowerCase();
      });

      // Transform any list of multiple date extractions into a single date range extraction.
      if(extractionObject.type === 'date' && extractionObject.data.length > 1) {
        var begin = extractionObject.data[0];
        var end = extractionObject.data[extractionObject.data.length - 1];
        var clone = _.cloneDeep(begin);
        clone.text = begin.text + ' and ' + end.text;
        clone.provenances = extractionObject.data.reduce(function(provenances, extraction) {
          return provenances.concat(extraction.provenances);
        }, []);
        clone.count = _.sum(extractionObject.data.map(function(extraction) {
          return extraction.count;
        }));
        var confidences = extractionObject.data.map(function(extraction) {
          return extraction.confidence;
        }).filter(function(confidence) {
          return !!confidence;
        });
        clone.confidence = (confidences.length ? (_.sum(confidences) / confidences.length) : 0);
        extractionObject.data = [clone];
      }

      extractionObject.index = index;
      return extractionObject;
    };

    resultObject.headerExtractions = searchFields.filter(function(object) {
      return object.result === 'header';
    }).map(function(object, index) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, object, highlights), index);
    }).sort(function(a, b) {
      if(a.isUrl && !b.isUrl) {
        return -1;
      }
      if(b.isUrl && !a.isUrl) {
        return 1;
      }
      if(a.isDate && !b.isDate) {
        return -1;
      }
      if(b.isDate && !a.isDate) {
        return 1;
      }
      return a.index - b.index;
    });

    resultObject.detailExtractions = searchFields.filter(function(object) {
      return object.result === 'detail';
    }).map(function(object) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, object, highlights));
    });

    resultObject.nestedExtractions = searchFields.filter(function(object) {
      return object.result === 'nested';
    }).map(function(object) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, object, highlights));
    });

    if(esDataEndpoint) {
      resultObject.details.push({
        name: 'Raw ES Document',
        link: esDataEndpoint,
        text: 'Open'
      });
    }

    if(resultObject.url) {
      resultObject.details.push({
        name: 'Url',
        link: resultObject.url,
        text: resultObject.url
      });
    }

    if(resultObject.crawlTimestamp && resultObject.crawlTimestamp !== 'Unknown') {
      resultObject.details.push({
        name: 'Date Crawled',
        text: resultObject.crawlTimestamp
      });
    }

    resultObject.details.push({
      name: 'Content',
      highlightedText: description.highlight || resultObject.description,
      text: resultObject.description
    });

    // The images should be undefined by default.
    var images = _.get(result, '_source.objects');
    resultObject.images = images ? getExtractionsFromList(images.map(function(object) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var id = object.img_sha1;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      return {
        key: id
      };
    }), esConfig.imageField || {}) : undefined;

    return resultObject;
  }

  function getWebpageResultObject(result, searchFields, highlights) {
    return createResultObject(result, searchFields, 'av:web-asset', 'Webpage', '', highlights);
  }

  function getQueryResultObject(result, searchFields, extractionId) {
    var searchFieldsObject = _.find(searchFields, function(object) {
      return object.key === extractionId;
    });
    return createResultObject(result, searchFields, searchFieldsObject.icon, searchFieldsObject.title, searchFieldsObject.styleClass);
  }

  function createDateHistogram(buckets, entityConfig) {
    if(buckets.length < 2) {
      return [];
    }

    return buckets.reduce(function(histogram, dateBucket) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count) {
        var data = [];
        if(entityConfig && dateBucket[entityConfig.key] && dateBucket[entityConfig.key].buckets) {
          data = dateBucket[entityConfig.key].buckets.map(function(entityBucket, index) {
            return getExtraction(entityBucket, entityConfig, index);
          }).filter(commonTransforms.getExtractionFilterFunction(entityConfig.type));
        }

        var dateObject = {
          date: commonTransforms.getFormattedDate(dateBucket.key),
          data: data
        };

        var sum = dateObject.data.reduce(function(sum, entityObject) {
          return sum + entityObject.count;
        }, 0);

        if(sum < count) {
          var text = '(Unidentified)';
          dateObject.data.push({
            count: count - sum,
            icon: entityConfig ? entityConfig.icon : undefined,
            styleClass: entityConfig ? entityConfig.styleClass : undefined,
            text: text,
            textAndCount: text + ' (' + (count) + ')'
          });
        }

        // The data list may be empty if none match the ID for the entity page.
        if(dateObject.data.length) {
          histogram.push(dateObject);
        }
      }

      return histogram;
    }, []).sort(function(a, b) {
      // Sort oldest first.
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  function createItemHistograms(buckets, showUnidentified, entityConfig, pageConfig, pageId) {
    if(buckets.length < 2) {
      return [];
    }

    var unidentifiedHistogram = {
      icon: entityConfig ? entityConfig.icon : undefined,
      name: '(Unidentified)',
      styleClass: entityConfig ? entityConfig.styleClass : undefined,
      points: []
    };

    var histograms = buckets.reduce(function(histograms, dateBucket) {
      var date = commonTransforms.getFormattedDate(dateBucket.key);

      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count && date) {
        var sum = 0;

        if(entityConfig && dateBucket[entityConfig.key] && dateBucket[entityConfig.key].buckets) {
          dateBucket[entityConfig.key].buckets.map(function(entityBucket, index) {
            return getExtraction(entityBucket, entityConfig, index);
          }).filter(commonTransforms.getExtractionFilterFunction(entityConfig.type)).forEach(function(dataItem) {
            var histogramIndex = _.findIndex(histograms, function(histogramItem) {
              return histogramItem.name === dataItem.text;
            });

            if(histogramIndex < 0) {
              histograms.push({
                icon: dataItem.icon,
                id: dataItem.id,
                link: dataItem.link,
                name: dataItem.text,
                styleClass: dataItem.styleClass,
                points: []
              });
              histogramIndex = histograms.length - 1;
            }

            histograms[histogramIndex].points.push({
              count: dataItem.count,
              date: date
            });

            sum += dataItem.count;
          });
        }

        if(sum < count) {
          unidentifiedHistogram.points.push({
            count: count - sum,
            date: date
          });
        }
      }

      return histograms;
    }, []).sort(function(a, b) {
      // Sort the page item to the top.
      if(entityConfig && pageConfig && entityConfig.key === pageConfig.key) {
        if(a.id === pageId) {
          return -1;
        }
        if(b.id === pageId) {
          return 1;
        }
      }

      // Sort the other items alphabetically.
      if(a.name.localeCompare) {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true
        });
      }
      return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });

    histograms.forEach(function(histogramItem) {
      histogramItem.points.sort(function(a, b) {
        // Sort oldest first.
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
    });

    return showUnidentified && unidentifiedHistogram.points.length ? histograms.concat(unidentifiedHistogram) : histograms;
  }

  return {
    /**
     * Returns the result object for the given query results to show in the result page.
     *
     * @param {Object} data
     * @param {Object} searchFields
     * @return {Object}
     */
    result: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return getWebpageResultObject(data.hits.hits[0], searchFields);
      }
      return {};
    },

    /**
     * Returns the list of result objects for the given query results to show in a result-list.
     *
     * @param {Object} data
     * @param {Object} searchFields
     * @return {Array}
     */
    results: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        var returnData = data.hits.hits.map(function(result) {
          // Data returned by the searchResults function from the searchTransforms will have a "highlights" property.
          return getWebpageResultObject(result, searchFields, data.highlights);
        }).filter(function(object) {
          return !_.isUndefined(object);
        });
        return returnData;
      }
      return [];
    },

    /**
     * Returns the collection of result IDs mapped to result objects for the given query results to show as nested data in a result-list.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Object}
     */
    nestedResults: function(data, config) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        var returnData = data.hits.hits.map(function(result) {
          return getQueryResultObject(result, config.searchFields, config.extractionId);
        }).filter(function(object) {
          return !_.isUndefined(object);
        });
        return returnData.reduce(function(collection, result) {
          collection[result.id] = result;
          return collection;
        }, {});
      }
      return {};
    },

    /**
     * Returns the link for the image with the given ID.
     *
     * @param {String} id
     * @return {String}
     */
    externalImageLink: function(id) {
      return commonTransforms.getLink(id, esConfig.imageField.link, esConfig.imageField.type, esConfig.imageField.key);
    },

    /**
     * Returns the list of extraction objects for the given query results to show in an aggregation-display.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Array}
     */
    extractions: function(data, config) {
      var extractions = [];
      var sayOther = false;

      if(data && data.aggregations && data.aggregations[config.entity.key] && data.aggregations[config.entity.key][config.entity.key]) {
        extractions = getExtractionsFromList(data.aggregations[config.entity.key][config.entity.key].buckets || [], config.entity).filter(function(extraction) {
          var result = config.id && config.page && config.page.type === config.entity.type ? extraction.id !== config.id : true;
          sayOther = sayOther || !result;
          return result;
        });
      }

      return extractions;
    },

    /**
     * Returns the histogram data for the given query results to show in a timeline bar chart (by date, then by item)
     * and a sparkline chart (by item, then by date) in an object with the "dates" and "items" properties.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Object}
     */
    histograms: function(data, config) {
      if(data && data.aggregations && data.aggregations[config.name] && data.aggregations[config.name][config.name]) {
        var buckets = data.aggregations[config.name][config.name].buckets;
        if(buckets.length > 1) {
          return {
            begin: commonTransforms.getFormattedDate(buckets[0].key),
            end: commonTransforms.getFormattedDate(buckets[buckets.length - 1].key),
            dates: createDateHistogram(buckets, config.entity),
            items: createItemHistograms(buckets, false, config.entity, config.page, config.id)
          };
        }
      }
      return {
        dates: [],
        items: []
      };
    },

    /**
     * Returns the data for the given result to show in maps in the result page.
     *
     * @param {Object} result
     * @param {Object} searchFields
     * @return {Array}
     */
    maps: function(result, searchFields) {
      if(!result || !result.headerExtractions || !result.detailExtractions) {
        return undefined;
      }

      var locationFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.isLocation && !searchFieldsObject.isHidden;
      });

      return locationFields.reduce(function(info, searchFieldsObject) {
        var headerIndex = _.findIndex(result.headerExtractions, function(extraction) {
          return extraction.key === searchFieldsObject.key;
        });
        var detailIndex = _.findIndex(result.detailExtractions, function(extraction) {
          return extraction.key === searchFieldsObject.key;
        });

        var extraction = (headerIndex >= 0 ? result.headerExtractions[headerIndex] : (detailIndex >= 0 ? result.detailExtractions[detailIndex] : {}));

        info.push({
          config: searchFieldsObject,
          data: extraction.data
        });

        return info;
      }, []);
    },

    /**
     * Returns the histogram data for the search page sparkline chart (by item, then by date) with unidentified data.
     *
     * @param {Object} data
     * @param {Object} property
     * @return {Object}
     */
    searchPageTimeline: function(data, property) {
      if(data && data.aggregations && data.aggregations[property] && data.aggregations[property][property]) {
        var buckets = data.aggregations[property][property].buckets;
        if(buckets.length > 1) {
          return {
            begin: commonTransforms.getFormattedDate(buckets[0].key),
            end: commonTransforms.getFormattedDate(buckets[buckets.length - 1].key),
            points: createItemHistograms(buckets, true)
          };
        }
      }
      return {
        points: []
      };
    },

    /**
     * Returns the cached page data for the given query results.
     *
     * @param {Object} data
     * @return {String}
     */
    cache: function(data) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return _.get(data.hits.hits[0], '_source.raw_content', '');
      }
      return '';
    }
  };
});
