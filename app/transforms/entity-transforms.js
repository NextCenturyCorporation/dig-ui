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

/* exported entityTransforms */
/* jshint camelcase:false */

var entityTransforms = (function(_, commonTransforms, esConfig) {
  function getAggregationBuckets(data, name) {
    if(data && data.aggregations && data.aggregations[name]) {
      if(data.aggregations[name][name]) {
        return data.aggregations[name][name].buckets || [];
      }
      return data.aggregations[name].buckets || [];
    }
    return [];
  }

  function getExtraction(item, config, index, confidence) {
    var key = _.isObject(item) ? item.key : item;
    var value = _.isObject(item) ? item.value : item;
    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    var count = item.doc_count;
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
    var extraction = {
      confidence: confidence,
      count: count,
      id: commonTransforms.getExtractionDataId(key, value, config.type),
      icon: config.icon,
      link: commonTransforms.getLink(key, config.link, config.type, config.key),
      provenances: [],
      styleClass: config.styleClass,
      text: commonTransforms.getExtractionDataText(key, value, config.type, (index || 0)),
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
      // Set the confidence to 100 if it is undefined.
      extraction.confidence = _.isUndefined(extraction.confidence) ? 100 : extraction.confidence;
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
      var locationData = commonTransforms.getLocationDataFromKey(key);
      extraction.latitude = locationData.latitude;
      extraction.longitude = locationData.longitude;
      extraction.text = locationData.text;
      extraction.textAndCountry = locationData.text + (locationData.country ? (', ' + locationData.country) : '');
    }

    if(config.type === 'image') {
      extraction.downloadSource = (esConfig ? esConfig.downloadImageUrl : '/') + (esConfig.downloadImageUrl === '/' ? '' : '/') + encodeURIComponent(key);
      extraction.source = commonTransforms.getImageUrl(key, esConfig);
    }

    var countLabel = extraction.count ? extraction.count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '';
    extraction.textAndCount = extraction.text + (countLabel ? (' (' + countLabel + ')') : '');
    return extraction;
  }

  function getExtractionsFromList(extractionList, config, hideIcons) {
    var extractionData = extractionList.map(function(item, index) {
      var confidence = _.isUndefined(item.confidence) ? undefined : (Math.round(Math.min(item.confidence, 1) * 10000.0) / 100.0);
      var extraction = getExtraction(item, config, index, confidence);
      if(hideIcons) {
        delete extraction.icon;
      }
      return extraction;
    });
    return extractionData.filter(commonTransforms.getExtractionFilterFunction(config.type));
  }

  function getExtractionsFromResult(result, path, config) {
    var data = _.get(result, path, []);
    return getExtractionsFromList((_.isArray(data) ? data : [data]), config);
  }

  function getHighlightPathList(highlights, result, text) {
    // The highlights property maps search terms to unique IDs.
    // The result.matched_queries property lists highlights in the format <id>:<path>:<text>

    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    var matchedQueries = result.matched_queries;
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

    // If a highlight mapping exists for the text, check the matched queries.
    if(highlights && text && highlights[text] && matchedQueries && matchedQueries.length) {
      return matchedQueries.filter(function(path) {
        return _.startsWith(path, highlights[text]);
      }).map(function(path) {
        // Return the path in the matched queries.
        return path.split(':')[1];
      });
    }

    return [];
  }

  function getHighlightPathListFromDataOfType(highlights, itemId, itemText, itemType, result) {
    var wordsOrPhrases = [];
    if(itemType === 'location') {
      // Add the city name.
      wordsOrPhrases = [itemId.substring(0, itemId.indexOf(':'))];
    } else if(itemType === 'phone') {
      // Add the phone without punctuation.
      wordsOrPhrases = [itemText, itemText.replace(/\W/g, '')];
    } else {
      // Add the full text and all single words in the text.  Remove all punctuation so we can separate the words.
      wordsOrPhrases = [itemText].concat(itemText.replace(/\W/g, ' ').split(' '));
    }

    var highlightPaths = {};

    wordsOrPhrases.forEach(function(wordOrPhrase) {
      var pathList = getHighlightPathList(highlights, result, wordOrPhrase);
      pathList.forEach(function(path) {
        highlightPaths[path] = true;
      });
    });

    return _.keys(highlightPaths);
  }

  function checkHighlightedText(text, type) {
    // TODO Do we have to hard-code <em> or can we make it a config variable?
    // Ignore partial matches for emails and websites.
    if((type === 'email' || type === 'tld' || type === 'url') && (!_.startsWith(text, '<em>') || !_.endsWith(text, '</em>'))) {
      return false;
    }

    var output = text;

    // Usernames are formatted "<website> <username>".  Ignore matches on the <website>.
    if(type === 'username') {
      if(output.indexOf(' ')) {
        var startHighlight = (output.indexOf('<em>') === 0);
        output = (startHighlight ? '<em>' : '') + output.substring(output.indexOf(' ') + 1);
      }
    }

    // Return whether the given text has both start and end tags.
    return output.indexOf('<em>') >= 0 && output.indexOf('</em>') >= 0 ? !!(output.replace(/<\/?em\>/g, '')) : false;
  }

  function getHighlightedText(highlightsPathList, resultHighlights, type) {
    var textList = [];
    if(resultHighlights) {
      // Find the highlighted text in the result highlights using a highlights path.  Use the first because they are all the same.
      (highlightsPathList || []).forEach(function(path) {
        (resultHighlights[path] || []).forEach(function(text) {
          if(checkHighlightedText(text, type)) {
            textList.push(text);
          }
        });
      });
    }
    return textList.length ? textList[0] : '';
  }

  function getHighlightedExtractionObjectFromResult(result, config, highlights) {
    var data = getExtractionsFromResult(result, config.extractionField, config);
    if(highlights) {
      data = data.map(function(item) {
        // Get the paths from the highlight mapping to search in the result highlights specifically for the given item.
        var pathList = getHighlightPathListFromDataOfType(highlights[config.key], ('' + item.id).toLowerCase(), ('' + item.text).toLowerCase(), config.type, result);
        // The highlight in the extraction object is a boolean (YES or NO).
        item.highlight = !!(getHighlightedText(pathList, result.highlight, config.type));
        return item;
      });
    }
    return {
      data: data,
      icon: config.icon,
      isDate: config.isDate,
      isUrl: config.isUrl,
      key: config.key,
      name: data.length === 1 ? config.title : config.titlePlural,
      styleClass: config.styleClass,
      type: config.type,
      width: config.width
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

  function getTitlesOrDescriptions(type, searchFields, result, highlights) {
    var titleOrDescriptionList = searchFields.filter(function(searchFieldsObject) {
      return searchFieldsObject.result === type;
    }).reduce(function(list, searchFieldsObject) {
      var data = _.get(result, searchFieldsObject.extractionField);
      if(_.isArray(data)) {
        return list.concat(data.map(function(dataItem) {
          return {
            key: searchFieldsObject.key,
            link: !!searchFieldsObject.link,
            name: searchFieldsObject.title,
            text: dataItem.value
          };
        }));
      }
      if(_.isObject(data)) {
        return list.concat({
          key: searchFieldsObject.key,
          link: !!searchFieldsObject.link,
          name: searchFieldsObject.title,
          text: data.value
        });
      }
      return list.concat({
        key: searchFieldsObject.key,
        link: !!searchFieldsObject.link,
        name: searchFieldsObject.title,
        text: data
      });
    }, []);

    return titleOrDescriptionList.map(function(titleOrDescription) {
      var text = (titleOrDescription.text || '');

      // Do not split the title/description into individual words/phrases or else matching extraction highlights may overwrite the title/description text.
      var pathList = highlights ? getHighlightPathList(highlights[titleOrDescription.key], result, text.toLowerCase()) : [];
      var highlight = getHighlightedText(pathList, result.highlight, type);

      var backupPath = (type === 'title' ? 'content_extraction.title.text' : 'content_extraction.content_strict.text');
      var backupHighlight = getHighlightedText([backupPath], result.highlight, type);

      if(!highlight && backupHighlight) {
        text = backupHighlight.replace(/<\/?em>/g, '');
        highlight = backupHighlight;
      }

      // Change newlines to breaks and remove repeat newlines.
      text = text.replace(/[\n\r][\s]*/g, '<br/>');
      highlight = highlight.replace(/[\n\r][\s]*/g, '<br/>');

      if(type === 'title') {
        // Remove breaks from titles.
        text = text.replace(/<br\/>/g, '');
        highlight = highlight.replace(/<br\/>/g, '');
      }

      return {
        link: titleOrDescription.link,
        name: titleOrDescription.name,
        text: text,
        highlight: highlight || text
      };
    });
  }

  /**
   * Creates and returns the transformed result object.
   *
   * @param {Object} result The elasticsearch result object.
   * @param {Array} searchFields The list of search fields config objects.
   * @param {String} icon
   * @param {String} name
   * @param {String} styleClass
   * @param {String} type
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
  function createResultObject(result, searchFields, icon, name, styleClass, type, highlights) {
    var id = _.get(result, esConfig.uid ? ('_source.' + esConfig.uid) : '_id');

    if(!id) {
      return undefined;
    }

    var timestamp;
    if(esConfig.timestamp) {
      timestamp = commonTransforms.getFormattedDate(_.get(result, '_source.' + esConfig.timestamp));
      if(timestamp === 'None') {
        timestamp = commonTransforms.getFormattedDate(_.get(result, '_source.timestamp'));
      }
    }

    var esDataEndpoint = (esConfig && esConfig.esDataEndpoint ? (esConfig.esDataEndpoint + id) : undefined);

    var titles = getTitlesOrDescriptions('title', searchFields, result, highlights);
    var title = !titles.length ? '' : (!esConfig.showMultipleTitles ? titles[0].text : titles.map(function(title) {
      return title.text;
    }).join(' '));

    var isLink = !titles.length ? false : (!esConfig.showMultipleTitles ? titles[0].link : titles.every(function(title) {
      return title.link;
    }));

    var descriptions = getTitlesOrDescriptions('description', searchFields, result, highlights);
    var description = !descriptions.length ? '' : (!esConfig.showMultipleDescriptions ? descriptions[0].text : descriptions.map(function(description) {
      return description.text;
    }).join(' '));

    var resultObject = {
      id: id,
      url: _.get(result, '_source.url'),
      revisions: esConfig.revisions ? _.get(result, '_source.' + esConfig.revisions) : undefined,
      timestamp: (timestamp === 'None' ? undefined : timestamp),
      type: type,
      icon: icon,
      link: isLink ? commonTransforms.getLink(id, 'result') : undefined,
      name: name,
      styleClass: styleClass,
      tags: getResultTags(result, '_source.knowledge_graph._tags'),
      esData: esDataEndpoint,
      title: title,
      description: description,
      headerExtractions: [],
      detailExtractions: [],
      nestedExtractions: [],
      details: [],
      series: []
    };

    resultObject.highlightedText = !titles.length ? '' : (!esConfig.showMultipleTitles ? titles[0].highlight : titles.map(function(title) {
      return title.highlight;
    }).join(' '));

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
        clone.text = 'From ' + begin.text + ' to ' + end.text;
        clone.provenances = extractionObject.data.reduce(function(provenances, extraction) {
          return provenances.concat(extraction.provenances);
        }, []);
        clone.count = _.sum(extractionObject.data.map(function(extraction) {
          return extraction.count;
        }));
        var confidences = extractionObject.data.map(function(extraction) {
          return extraction.confidence;
        }).filter(function(confidence) {
          return confidence >= 0;
        });
        clone.confidence = (confidences.length ? (_.sum(confidences) / confidences.length) : undefined);
        extractionObject.data = [clone];
      }

      // Ignore undefined indexes.
      if(typeof index !== 'undefined') {
        extractionObject.index = index;
      }

      return extractionObject;
    };

    resultObject.headerExtractions = searchFields.filter(function(searchFieldsObject) {
      return searchFieldsObject.result === 'header';
    }).map(function(searchFieldsObject, index) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, searchFieldsObject, highlights), index);
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

    resultObject.detailExtractions = searchFields.filter(function(searchFieldsObject) {
      return searchFieldsObject.result === 'detail';
    }).map(function(searchFieldsObject) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, searchFieldsObject, highlights));
    });

    resultObject.nestedExtractions = searchFields.filter(function(searchFieldsObject) {
      return searchFieldsObject.result === 'nested' && searchFieldsObject.type === 'kg_id';
    }).map(function(searchFieldsObject) {
      return finalizeExtractionFunction(getHighlightedExtractionObjectFromResult(result, searchFieldsObject, highlights));
    });

    // For now, just get the first field of each type (series, series date, series number, type).
    var seriesField = searchFields.find(function(searchFieldsObject) {
      return searchFieldsObject.result === 'series' && searchFieldsObject.type === 'kg_id';
    });
    var seriesDateField = searchFields.find(function(searchFieldsObject) {
      return searchFieldsObject.result === 'series' && searchFieldsObject.type === 'date';
    });
    var seriesNumberField = searchFields.find(function(searchFieldsObject) {
      return searchFieldsObject.result === 'series' && searchFieldsObject.type === 'number';
    });
    var typeField = searchFields.find(function(searchFieldsObject) {
      return searchFieldsObject.type === 'type';
    });

    if(seriesField && seriesDateField && seriesNumberField && typeField) {
      var types = _.get(result, typeField.extractionField, []);
      if(types.some(function(type) {
        return type.key === 'measure';
      })) {
        resultObject.series = [{
          color: commonTransforms.getHexColor(seriesField.color),
          id: id,
          dateField: seriesDateField.field,
          idField: seriesField.field,
          numberField: seriesNumberField.field,
          title: seriesField.title,
          typeField: typeField.field
        }];
      }
    }

    if(esDataEndpoint) {
      resultObject.details.push({
        name: 'Raw ES Data',
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

    if(resultObject.timestamp) {
      resultObject.details.push({
        name: 'Timestamp',
        text: resultObject.timestamp
      });
    }

    (!esConfig.showMultipleDescriptions && descriptions.length ? [descriptions[0]] : descriptions).forEach(function(description) {
      resultObject.details.push({
        name: description.name,
        highlightedText: description.highlight || description.text,
        text: description.text
      });
    });

    if(!esConfig.hideCachedPage) {
      resultObject.details.push({
        name: 'Cached Page',
        link: commonTransforms.getLink(id, 'cached'),
        text: 'Open in New Tab (Runs External Code)'
      });
    }

    // The images should be undefined by default.
    var images = _.get(result, '_source.objects');
    resultObject.images = images ? getExtractionsFromList(_.uniqBy(images.map(function(object) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var id = object.img_sha1;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      return {
        key: id
      };
    }), 'key'), esConfig.imageField || {}) : undefined;

    return resultObject;
  }

  function getWebpageResultObject(result, searchFields, highlights) {
    return createResultObject(result, searchFields, esConfig.webpageField.icon, esConfig.webpageField.title, esConfig.webpageField.styleClass, 'webpage', highlights);
  }

  function getQueryResultObject(result, searchFields, extractionId) {
    var searchFieldsObject = _.find((searchFields || []), function(object) {
      return object.key === extractionId;
    });
    if(!searchFieldsObject) {
      return undefined;
    }
    return createResultObject(result, searchFields, searchFieldsObject.icon, searchFieldsObject.title, searchFieldsObject.styleClass, searchFieldsObject.key);
  }

  function createHistogram(buckets, entityConfig, interval, timeStringBegin, timeStringEnd, unidentifiedBucketName) {
    var timeBegin = timeStringBegin ? commonTransforms.getDateForInterval(timeStringBegin, interval).getTime() : null;
    var timeEnd = timeStringEnd ? commonTransforms.getDateForInterval(timeStringEnd, interval).getTime() : null;

    var bucketDateToData = buckets.reduce(function(dateToData, dateBucket) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count) {
        var date = commonTransforms.getFormattedDate(dateBucket.key, interval);
        var data = (entityConfig && dateBucket[entityConfig.key] && dateBucket[entityConfig.key].buckets) ? dateBucket[entityConfig.key].buckets : [];

        if(!dateToData[date]) {
          dateToData[date] = {
            count: count,
            data: data
          };
        } else {
          dateToData[date].count += count;
          dateToData[date].data = dateToData[date].data.concat(data.reduce(function(uniqueData, item) {
            if(!dateToData[date].data.some(function(existingItem) {
              return existingItem.key === item.key;
            })) {
              uniqueData.push(item);
            }
            return uniqueData;
          }, []));
        }
      }

      return dateToData;
    }, {});

    return _.keys(bucketDateToData).reduce(function(timeline, date) {
      var data = bucketDateToData[date].data.map(function(entityBucket, index) {
        return getExtraction(entityBucket, entityConfig, index);
      }).filter(commonTransforms.getExtractionFilterFunction(entityConfig ? entityConfig.type : null));

      var dateObject = {
        date: date,
        data: data
      };

      var sum = dateObject.data.reduce(function(sum, entityObject) {
        return sum + entityObject.count;
      }, 0);

      if(sum < bucketDateToData[date].count) {
        var countLabel = (bucketDateToData[date].count - sum).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        dateObject.data.push({
          count: bucketDateToData[date].count - sum,
          icon: entityConfig ? entityConfig.icon : undefined,
          styleClass: entityConfig ? entityConfig.styleClass : undefined,
          text: unidentifiedBucketName,
          textAndCount: unidentifiedBucketName ? (unidentifiedBucketName + ' (' + (countLabel) + ')') : undefined,
        });
      }

      // The data list may be empty if none match the ID for the entity page.
      if(dateObject.data.length) {
        timeline.push(dateObject);
      }

      return timeline;
    }, []).filter(function(item) {
      var time = new Date(item.date).getTime();
      return (timeBegin ? time >= timeBegin : true) && (timeEnd ? time <= timeEnd : true);
    }).sort(function(a, b) {
      // Sort oldest first.
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  function createSparklines(buckets, showUnidentified, timeBegin, timeEnd, entityConfig, pageConfig, pageId) {
    if(buckets.length < 2) {
      return [];
    }

    var unidentifiedTimeline = {
      icon: entityConfig ? entityConfig.icon : undefined,
      name: '(Unidentified)',
      styleClass: entityConfig ? entityConfig.styleClass : undefined,
      points: []
    };

    var timelines = buckets.reduce(function(timelines, dateBucket) {
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
            var timelineIndex = _.findIndex(timelines, function(timelineItem) {
              return timelineItem.name === dataItem.text;
            });

            if(timelineIndex < 0) {
              timelines.push({
                icon: dataItem.icon,
                id: dataItem.id,
                link: dataItem.link,
                maxCount: 0,
                name: dataItem.text,
                styleClass: dataItem.styleClass,
                points: []
              });
              timelineIndex = timelines.length - 1;
            }

            timelines[timelineIndex].points.push({
              count: dataItem.count,
              date: date
            });

            timelines[timelineIndex].maxCount = Math.max(timelines[timelineIndex].maxCount, dataItem.count);

            sum += dataItem.count;
          });
        }

        if(sum < count) {
          unidentifiedTimeline.points.push({
            count: count - sum,
            date: date
          });
        }
      }

      return timelines;
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

      // Sort the other items by max count and then alphabetically.
      if(a.maxCount !== b.maxCount) {
        return a.maxCount > b.maxCount ? -1 : 1;
      }

      if(a.name.localeCompare) {
        return a.name.localeCompare(b.name, undefined, {
          numeric: true
        });
      }

      return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
    });

    if(showUnidentified && unidentifiedTimeline.points.length) {
      timelines.push(unidentifiedTimeline);
    }

    return timelines.map(function(timelineItem) {
      timelineItem.points = timelineItem.points.filter(function(item) {
        var time = new Date(item.date).getTime();
        return (timeBegin ? time >= timeBegin : true) && (timeEnd ? time <= timeEnd : true);
      }).sort(function(a, b) {
        // Sort oldest points first.
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      return timelineItem;
    }).filter(function(timelineItem) {
      return timelineItem.points.length > 1;
    });
  }

  return {
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
    },

    /**
     * Returns the link for the image entity page with the given ID.
     *
     * @param {String} id
     * @return {String}
     */
    entityPageLinkForImageId: function(id) {
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
      return getExtractionsFromList(getAggregationBuckets(data, config.entity.key), config.entity, true).filter(function(extraction) {
        var result = config.id && config.page && config.page.type === config.entity.key ? extraction.id !== config.id : true;
        return result;
      });
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

        if(headerIndex >= 0) {
          info.push({
            config: searchFieldsObject,
            data: result.headerExtractions[headerIndex].data
          });
        }

        var detailIndex = _.findIndex(result.detailExtractions, function(extraction) {
          return extraction.key === searchFieldsObject.key;
        });

        if(detailIndex >= 0) {
          info.push({
            config: searchFieldsObject,
            data: result.detailExtractions[headerIndex].data
          });
        }

        return info;
      }, []);
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
     * Returns the result object for the given query results to show in the result page.
     *
     * @param {Object} data
     * @param {Object} searchFields
     * @return {Object}
     */
    result: function(data, searchFields) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        return getWebpageResultObject(data.hits.hits[0], searchFields) || {};
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
     * Returns the timeline data for the search page sparkline chart (by item, then by date) with unidentified data.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Object}
     */
    searchPageTimeline: function(data, config) {
      var buckets = getAggregationBuckets(data, config.name);
      if(buckets.length > 1) {
        return {
          begin: commonTransforms.getFormattedDate(config.begin || buckets[0].key),
          end: commonTransforms.getFormattedDate(config.end || buckets[buckets.length - 1].key),
          sparklines: createSparklines(buckets, true, (config.begin ? new Date(config.begin).getTime() : null), (config.end ? new Date(config.end).getTime() : null))
        };
      }
      return {
        sparklines: []
      };
    },

    /**
     * Returns the time series for the given query results to show in a bar chart.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Array}
     */
    series: function(data, config) {
      if(data && data.hits && data.hits.hits && data.hits.hits.length) {
        /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
        var buckets = data.hits.hits.reduce(function(bucketsInLoop, result) {
          var dates = _.get(result, config.dateField, []);
          var numbers = _.get(result, config.numberField, []);
          for(var i = 0; i < Math.min(dates.length, numbers.length); ++i) {
            bucketsInLoop.push({
              key: dates[i].key,
              doc_count: parseFloat(numbers[i].key)
            });
          }
          return bucketsInLoop;
        }, []).filter(function(bucket) {
          return bucket.key && bucket.doc_count;
        });
        /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
        return createHistogram(buckets, {}, config.interval);
      }
      return [];
    },

    /**
     * Returns the timeline data for the given query results to show in a timeline bar chart (by date, then by item)
     * and a sparkline chart (by item, then by date) in an object with the "dates" and "items" properties.
     *
     * @param {Object} data
     * @param {Object} config
     * @return {Object}
     */
    timelines: function(data, config) {
      var buckets = getAggregationBuckets(data, config.name);
      if(buckets.length > 1) {
        return {
          begin: commonTransforms.getFormattedDate(config.begin || buckets[0].key),
          end: commonTransforms.getFormattedDate(config.end || buckets[buckets.length - 1].key),
          histogram: createHistogram(buckets, config.entity, config.interval, config.begin, config.end, config.unidentified || '(Unidentified)'),
          sparklines: createSparklines(buckets, false, null, null, config.entity, config.page, config.id)
        };
      }
      return {
        histogram: [],
        sparklines: []
      };
    }
  };
});
