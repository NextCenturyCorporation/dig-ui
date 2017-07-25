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
      styleClass: commonTransforms.getStyleClass(config.color),
      text: commonTransforms.getExtractionDataText(item.key, item.value, config.type, (index || 0)),
      type: config.key,
      provenance: item.provenance
    };
    if(config.type !== 'url') {
      extraction.classifications = {
        database: '',
        type: config.key,
        user: ''
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
      extraction.source = item.key;
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
      name: config.titlePlural
    };
  }

  function getTitleOrDescription(type, searchFields, result, path, highlightMapping) {
    var searchFieldsObject = _.find(searchFields, function(object) {
      return object.result === type;
    });

    // By default, use the given non-knowledge-graph path.
    var returnObject = {
      text: getSingleStringFromResult(result, path),
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
        returnObject.highlight = highlightMapping ? (getHighlightedText(returnObject.text, returnObject.text, result, type, highlightMapping[searchFieldsObject.key]) || returnObject.text) : undefined;
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
    var url = _.get(result, '_source.url');

    if(!id || !url) {
      return {};
    }

    var rank = _.get(result, '_score');
    var esDataEndpoint = (esConfig && esConfig.esDataEndpoint ? (esConfig.esDataEndpoint + id) : undefined);

    var title = getTitleOrDescription('title', searchFields, result, '_source.content_extraction.title.text', highlightMapping);
    var description = getTitleOrDescription('description', searchFields, result, '_source.content_extraction.content_strict.text', highlightMapping);

    var documentObject = {
      id: id,
      url: url,
      rank: rank ? rank.toFixed(2) : rank,
      type: 'document',
      icon: '',
      link: commonTransforms.getLink(id, 'document'),
      styleClass: '',
      cached: commonTransforms.getLink(id, 'cached'),
      esData: esDataEndpoint,
      title: title.text || 'No Title',
      description: description.text || 'No Description',
      highlightedText: title.highlight,
      headerExtractions: [],
      detailExtractions: [],
      details: []
    };

    var finalizeExtractionFunction = function(extractionObject) {
      extractionObject.data = extractionObject.data.sort(function(a, b) {
        if(extractionObject.type === 'date') {
          return new Date(a.id) - new Date(b.id);
        }
        return ('' + a.text).toLowerCase() - ('' + b.text).toLowerCase();
      });
      if(!documentPage) {
        // TODO Don't truncate the extractions once the data can support it.
        extractionObject.data = extractionObject.data.slice(0, 10);
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

    documentObject.details.push({
      name: 'Url',
      link: url,
      text: url
    });

    documentObject.details.push({
      name: 'Description',
      highlightedText: description.highlight,
      text: documentObject.description
    });

    if(documentObject.cached) {
      documentObject.details.push({
        name: 'Cached Ad Webpage',
        link: documentObject.cached,
        text: 'Open'
      });
    }

    // TODO Will the images be moved from _source.objects to _source.knowledge_graph?
    var images = _.get(result, '_source.objects', []);
    documentObject.images = images.map(function(image) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var source = image.obj_stored_url;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      return {
        source: (esConfig ? esConfig.imagePrefix || '' : '') + source
      };
    });

    return documentObject;
  }

  function createDateObjectFromBucket(dateBucket, config) {
    var newData = [];
    if(dateBucket && dateBucket[config.entity.key] && dateBucket[config.entity.key].buckets) {
      newData = dateBucket[config.entity.key].buckets.map(function(entityBucket, index) {
        return getExtraction(entityBucket, config.entity, index);
      }).filter(commonTransforms.getExtractionFilterFunction(config.entity.type));
    }
    return {
      date: commonTransforms.getFormattedDate(dateBucket.key),
      icon: config.date.icon,
      styleClass: config.date.styleClass,
      data: newData
    };
  }

  function createUnidentifiedEntityObject(config, count) {
    var text = 'Unidentified ' + config.titlePlural;
    return {
      count: count,
      icon: config.icon,
      styleClass: commonTransforms.getStyleClass(config.color),
      text: text,
      textAndCount: text + ' (' + (count) + ')',
      type: config.key
    };
  }

  function createSubtitle(data) {
    var subtitle = data.map(function(entityObject) {
      return entityObject.textAndCount;
    });
    return subtitle.length ? subtitle[0].text + (subtitle.length > 1 ? (' and ' + (subtitle.length - 1) + ' more') : '') : '';
  }

  function createDateHistogram(buckets, config) {
    var doesHaveIdentifiedData = false;

    var histogram = buckets.reduce(function(histogram, dateBucket) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count) {
        var dateObject = createDateObjectFromBucket(dateBucket, config);

        var sum = dateObject.data.reduce(function(sum, entityObject) {
          return sum + entityObject.count;
        }, 0);

        doesHaveIdentifiedData = doesHaveIdentifiedData || !!sum;

        if(sum < count) {
          dateObject.data.push(createUnidentifiedEntityObject(config.entity, count - sum));
        }

        if(config.entity.key === config.page.key) {
          // Filter out the items that do not match the ID for the entity page (only once the unknown item is created).
          dateObject.data = dateObject.data.filter(function(entityObject) {
            return entityObject.id === config.id;
          });
        }

        // The data list may be empty if none match the ID for the entity page.
        if(dateObject.data.length) {
          dateObject.subtitle = createSubtitle(dateObject.data);
          histogram.push(dateObject);
        }
      }

      return histogram;
    }, []).sort(function(a, b) {
      // Sort oldest first.
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return doesHaveIdentifiedData ? histogram : [];
  }

  return {
    document: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return getDocumentObject(data.hits.hits[0], searchFields, true);
      }
      return {};
    },

    documents: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return data.hits.hits.map(function(result) {
          // Data returned by the searchResults function from the searchTransforms will have a "fields" property.
          return getDocumentObject(result, searchFields, false, data.fields);
        });
      }
      return [];
    },

    externalImageLink: function(id) {
      return commonTransforms.getLink(id, 'image');
    },

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

    histogram: function(data, config) {
      if(data && data.aggregations && data.aggregations[config.date.key] && data.aggregations[config.date.key][config.date.key]) {
        return createDateHistogram(data.aggregations[config.date.key][config.date.key].buckets, config);
      }
      return {};
    }
  };
});
