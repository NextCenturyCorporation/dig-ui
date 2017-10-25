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
  function getSingleStringFromResult(result, path) {
    var parentPath = path.substring(0, path.lastIndexOf('.'));
    var property = path.substring(path.lastIndexOf('.') + 1, path.length);
    var data = _.get(result, parentPath, []);

    if(data && _.isArray(data)) {
      return data.length ? data.map(function(item) {
        return item[property];
      }).join('\n') : undefined;
    }

    return data ? data[property] : undefined;
  }

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
      styleClass: commonTransforms.getStyleClass(config.color),
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
    return getExtractionsFromList(data, config);
  }

  function getHighlightPathList(itemId, itemText, result, type, highlightMapping) {
    // The highlightMapping property maps search terms to unique IDs.
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

    if(matchedQueries && matchedQueries.length && highlightMapping) {
      wordsOrPhrases.forEach(function(wordOrPhrase) {
        // If a highlight mapping exists for the word or phrase, check the matched queries.
        if(highlightMapping[wordOrPhrase]) {
          return matchedQueries.filter(function(path) {
            return _.startsWith(path, highlightMapping[wordOrPhrase]);
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

  function getHighlightedText(itemId, itemText, result, type, highlightMapping) {
    // Get the paths from the highlight mapping to explore in the result highlights specifically for the given item.
    var pathList = getHighlightPathList(('' + itemId).toLowerCase(), ('' + itemText).toLowerCase(), result, type, highlightMapping);
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

  function getHighlightedExtractionObjectFromResult(result, config, highlightMapping) {
    var data = getExtractionsFromResult(result, '_source.knowledge_graph.' + config.key, config);
    if(highlightMapping) {
      data = data.map(function(item) {
        // The highlight in the extraction object is a boolean (YES or NO).
        item.highlight = !!(getHighlightedText(item.id, item.text, result, config.type, highlightMapping[config.key]));
        return item;
      });
    }
    return {
      data: data,
      key: config.key,
      name: config.titlePlural,
      type: config.type
    };
  }

  function getDocumentTags(result, path) {
    var tags = _.get(result, path, {});
    return _.keys(tags).reduce(function(object, tag) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var userClassification = '' + tags[tag].human_annotation;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      object[tag] = {
        type: 'ad',
        user: (userClassification === '1' ? 'positive' : (userClassification === '0' ? 'negative' : undefined))
      };
      return object;
    }, {});
  }

  function getTitleOrDescription(type, searchFields, result, path, highlightMapping) {
    var searchFieldsObject = _.find(searchFields, function(object) {
      return object.result === type;
    });

    // By default, use the given non-knowledge-graph path.
    var returnObject = {
      text: getSingleStringFromResult(result, '_source.' + path),
      // The highlight in the title/description object is the tagged text.
      highlight: result.highlight && result.highlight[path] && result.highlight[path].length ? result.highlight[path][0] : undefined
    };

    // Use the extraction data from the field in the searchFieldsObject if possible.  This overwrites the default.
    if(searchFieldsObject) {
      var extraction = _.get(result, '_source.knowledge_graph.' + searchFieldsObject.key);
      if(_.isObject(extraction) || _.isArray(extraction)) {
        if(_.isObject(extraction)) {
          returnObject.text = extraction.value;
        }
        if(_.isArray(extraction)) {
          returnObject.text = extraction.map(function(object) {
            return object.value;
          }).join(' ');
        }
        if(highlightMapping) {
          var highlight = getHighlightedText(returnObject.text, returnObject.text, result, type, highlightMapping[searchFieldsObject.key]);
          returnObject.highlight = highlight || returnObject.highlight || returnObject.text;
        }
      }
    }

    return returnObject;
  }

  /**
   * Creates and returns the transformed document object.
   *
   * @param {Object} result The elasticsearch result object.
   * @param {Array} searchFields The list of search fields config objects.
   * @param {Boolean} documentPage Whether to create an object for the document page (rather than the entity page).
   * @param {Object} highlightMapping The highlight mapping returned by the search.  An object that maps search fields to objects that map search terms to unique IDs.  For example:
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
  function getDocumentObject(result, searchFields, documentPage, highlightMapping) {
    var id = _.get(result, '_source.doc_id');

    if(!id) {
      return undefined;
    }

    // var rank = _.get(result, '_score');
    var time = commonTransforms.getFormattedDate(_.get(result, 'timestamp'));
    var esDataEndpoint = (esConfig && esConfig.esDataEndpoint ? (esConfig.esDataEndpoint + id) : undefined);

    var title = getTitleOrDescription('title', searchFields, result, 'content_extraction.title.text', highlightMapping);
    var description = getTitleOrDescription('description', searchFields, result, 'content_extraction.content_strict.text', highlightMapping);

    var documentObject = {
      id: id,
      url: _.get(result, '_source.url'),
      // rank: rank ? rank.toFixed(2) : rank,
      time: time,
      type: 'ad',
      icon: '',
      link: commonTransforms.getLink(id, 'ad'),
      styleClass: '',
      tags: getDocumentTags(result, '_source.knowledge_graph._tags'),
      esData: esDataEndpoint,
      title: title.text || 'No Title',
      description: description.text || 'No Description',
      headerExtractions: [],
      detailExtractions: [],
      details: []
    };

    documentObject.highlightedText = title.highlight || documentObject.title;

    var finalizeExtractionFunction = function(extractionObject) {
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
        clone.text = begin.text + ' to ' + end.text;
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

      return extractionObject;
    };

    documentObject.headerExtractions = searchFields.filter(function(object) {
      return object.result === 'header';
    }).map(function(object) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, object, highlightMapping));
    });

    documentObject.detailExtractions = searchFields.filter(function(object) {
      return object.result === 'detail';
    }).map(function(object) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, object, highlightMapping));
    });

    if(esDataEndpoint) {
      documentObject.details.push({
        name: 'Raw ES Document',
        link: esDataEndpoint,
        text: 'Open'
      });
    }

    if(documentObject.url) {
      documentObject.details.push({
        name: 'Url',
        link: documentObject.url,
        text: documentObject.url
      });
    }

    documentObject.details.push({
      name: 'Description',
      highlightedText: description.highlight || documentObject.description,
      text: documentObject.description
    });

    documentObject.images = getExtractionsFromList(_.get(result, '_source.objects', []).map(function(object) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var id = object.img_sha1;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      return {
        key: id
      };
    }), esConfig.imageField || {});

    return documentObject;
  }

  function createDateHistogram(buckets, config) {
    if(buckets.length < 2) {
      return [];
    }

    return buckets.reduce(function(histogram, dateBucket) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count) {
        var data = [];
        if(config.entity && dateBucket[config.entity.key] && dateBucket[config.entity.key].buckets) {
          data = dateBucket[config.entity.key].buckets.map(function(entityBucket, index) {
            return getExtraction(entityBucket, config.entity, index);
          }).filter(commonTransforms.getExtractionFilterFunction(config.entity.type));
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
            icon: config.entity ? config.entity.icon : undefined,
            styleClass: config.entity ? commonTransforms.getStyleClass(config.entity.color) : undefined,
            text: text,
            textAndCount: text + ' (' + (count) + ')'
          });
        }

        if(config.entity && config.page && config.entity.key === config.page.key) {
          // Filter out the items that do not match the ID for the entity page (do this following the creation of the unidentified object).
          dateObject.data = dateObject.data.filter(function(entityObject) {
            return entityObject.id === config.id;
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

  function createItemHistograms(buckets, config, showUnidentified) {
    if(buckets.length < 2) {
      return [];
    }

    var unidentifiedHistogram = {
      icon: config.entity ? config.entity.icon : undefined,
      name: '(Unidentified)',
      styleClass: config.entity ? commonTransforms.getStyleClass(config.entity.color) : undefined,
      points: []
    };

    var histograms = buckets.reduce(function(histograms, dateBucket) {
      var date = commonTransforms.getFormattedDate(dateBucket.key);

      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count && date) {
        var sum = 0;

        if(config.entity && dateBucket[config.entity.key] && dateBucket[config.entity.key].buckets) {
          dateBucket[config.entity.key].buckets.map(function(entityBucket, index) {
            return getExtraction(entityBucket, config.entity, index);
          }).filter(commonTransforms.getExtractionFilterFunction(config.entity.type)).forEach(function(dataItem) {
            var histogramIndex = _.findIndex(histograms, function(histogramItem) {
              return histogramItem.name === dataItem.text;
            });

            if(histogramIndex < 0) {
              histograms.push({
                icon: dataItem.icon,
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
      // Sort alphabetically.
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
     * Returns the document object for the given query results to show in the document page.
     *
     * @param {Object} data
     * @param {Object} searchFields
     * @return {Object}
     */
    document: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return getDocumentObject(data.hits.hits[0], searchFields, true);
      }
      return {};
    },

    /**
     * Returns the extractions for the given document to show in the document page.
     *
     * @param {Object} document
     * @param {Object} searchFields
     * @return {Object}
     */
    documentInfo: function(document, searchFields) {
      if(!document || !document.headerExtractions || !document.detailExtractions) {
        return undefined;
      }

      var resultFields = searchFields.filter(function(searchFieldsObject) {
        return searchFieldsObject.result === 'header' || searchFieldsObject.result === 'detail';
      });

      return resultFields.reduce(function(info, searchFieldsObject) {
        var headerIndex = _.findIndex(document.headerExtractions, function(extraction) {
          return extraction.key === searchFieldsObject.key;
        });
        var detailIndex = _.findIndex(document.detailExtractions, function(extraction) {
          return extraction.key === searchFieldsObject.key;
        });

        var extraction = (headerIndex >= 0 ? document.headerExtractions[headerIndex] : (detailIndex >= 0 ? document.detailExtractions[detailIndex] : {}));

        info.push({
          config: searchFieldsObject,
          data: extraction.data
        });

        return info;
      }, []);
    },

    /**
     * Returns the list of document objects for the given query results to show in a result-list.
     *
     * @param {Object} data
     * @param {Object} searchFields
     * @return {Array}
     */
    documents: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        var returnData = data.hits.hits.map(function(result) {
          // Data returned by the searchResults function from the searchTransforms will have a "fields" property.
          return getDocumentObject(result, searchFields, false, data.fields);
        }).filter(function(object) {
          return !_.isUndefined(object);
        });
        return returnData;
      }
      return [];
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
      if(data && data.aggregations && data.aggregations[config.date.key] && data.aggregations[config.date.key][config.date.key]) {
        return {
          dates: createDateHistogram(data.aggregations[config.date.key][config.date.key].buckets, config),
          items: createItemHistograms(data.aggregations[config.date.key][config.date.key].buckets, config)
        };
      }
      return {
        dates: [],
        items: []
      };
    },

    /**
     * Returns the histogram data for the search page sparkline chart (by item, then by date) with unidentified data.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Object}
     */
    searchPageTimeline: function(data, config) {
      if(data && data.aggregations && data.aggregations[config.date.key] && data.aggregations[config.date.key][config.date.key]) {
        var buckets = data.aggregations[config.date.key][config.date.key].buckets;
        if(buckets.length > 1) {
          return {
            begin: commonTransforms.getFormattedDate(buckets[0].key),
            end: commonTransforms.getFormattedDate(buckets[buckets.length - 1].key),
            points: createItemHistograms(buckets, config, true)
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
