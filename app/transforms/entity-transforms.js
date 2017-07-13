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
      link: commonTransforms.getLink(item.key, config.link, config.key),
      styleClass: commonTransforms.getStyleClass(config.color),
      text: commonTransforms.getExtractionDataText(item.key, item.value, config.type, (index || 0)),
      type: config.key
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

  function getHighlightedText(result, paths) {
    var path = _.find(paths, function(path) {
      return result.highlight && result.highlight[path] && result.highlight[path].length && result.highlight[path][0];
    });
    return path ? result.highlight[path][0] : undefined;
  }

  function getHighlightPathList(item, result, highlightMapping) {
    /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
    var pathList = result.matched_queries;
    /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

    if(pathList && pathList.length && highlightMapping && highlightMapping[item.id]) {
      return pathList.filter(function(path) {
        return _.startsWith(path, highlightMapping[item.id]);
      }).map(function(path) {
        return path.split(':')[1];
      });
    }

    return [];
  }

  function cleanHighlight(text, type) {
    // Ignore partial matches for emails.
    if(type === 'email' && (!_.startsWith(text, '<em>') || !_.endsWith(text, '</em>'))) {
      return text.toLowerCase();
    }

    var output = text;

    // Usernames are formatted "<website> <username>".  Ignore matches on the <website>.
    if(type === 'username') {
      output = output.indexOf(' ') ? output.substring(output.indexOf(' ') + 1) : output;
    }

    return output.indexOf('<em>') >= 0 ? output.replace(/<\/?em\>/g, '').toLowerCase() : '';
  }

  function addHighlight(item, result, type, highlightMapping) {
    var pathList = getHighlightPathList(item, result, highlightMapping);
    if(result.highlight && pathList.length) {
      item.highlight = pathList.some(function(path) {
        return (result.highlight[path] || []).some(function(text) {
          var cleanedHighlight = cleanHighlight(text, type);
          return cleanedHighlight && (('' + item.id).toLowerCase().indexOf(cleanedHighlight) >= 0);
        });
      });
    }
    return item;
  }

  function addAllHighlights(data, result, type, highlightMapping) {
    return data.map(function(item) {
      return addHighlight(item, result, type, highlightMapping);
    });
  }

  function getHighlightedExtractionObjectFromResult(result, config, highlightMapping) {
    var data = getExtractionsFromResult(result, '_source.knowledge_graph.' + config.key, config);
    if(highlightMapping) {
      data = addAllHighlights(data, result, config.type, highlightMapping[config.key]);
    }
    return {
      data: data,
      key: config.key,
      name: config.titlePlural
    };
  }

  function getDocumentObject(result, searchFields, documentPage, highlightMapping) {
    var id = _.get(result, '_source.doc_id');
    var url = _.get(result, '_source.url');

    if(!id || !url) {
      return {};
    }

    var rank = _.get(result, '_score');
    var esDataEndpoint = (esConfig && esConfig.esDataEndpoint ? (esConfig.esDataEndpoint + id) : undefined);

    var titleFieldObject = _.find(searchFields, function(object) {
      return object.result === 'title';
    });

    var titleText;
    var titleHighlight;

    if(titleFieldObject && titleFieldObject.field) {
      titleText = getSingleStringFromResult(result, titleFieldObject.field);
      titleHighlight = getHighlightedText(result, [titleFieldObject.field]);
    }

    // if there's no titleFieldObject or the title cannot be found there, use an alternate field
    if(!titleText) {
      titleText = getSingleStringFromResult(result, '_source.content_extraction.title.text');
      titleHighlight = getHighlightedText(result, ['_source.content_extraction.title.text']);
    }

    var descriptionText;
    var descriptionHighlight;

    var descriptionFieldObject = _.find(searchFields, function(object) {
      return object.result === 'description';
    });

    if(descriptionFieldObject && descriptionFieldObject.field) {
      descriptionText = getSingleStringFromResult(result, descriptionFieldObject.field);
      descriptionHighlight = getHighlightedText(result, [descriptionFieldObject.field]);
    }

    // if there's no descriptionFieldObject or the description cannot be found there, use an alternate field
    if(!descriptionText) {
      descriptionText = getSingleStringFromResult(result, '_source.content_extraction.content_strict.text');
      descriptionHighlight = getHighlightedText(result, ['_source.content_extraction.content_strict.text']);
    }

    var documentObject = {
      id: id,
      url: url,
      rank: rank ? rank.toFixed(2) : rank,
      type: 'document',
      icon: '', // icon: 'icons:assignment', -- commenting out for now and leaving blank
      link: commonTransforms.getLink(id, 'entity', 'document'),
      styleClass: '',
      cached: commonTransforms.getLink(id, 'cached'),
      esData: esDataEndpoint,
      // TODO
      title: titleText || 'No Title',
      description: descriptionText || 'No Description',
      highlightedText: titleHighlight,
      headerExtractions: [],
      detailExtractions: [],
      details: []
    };

    // TODO Don't truncate the extractions once the data can support it.
    var truncateFunction = function(extractionObject) {
      if(!documentPage) {
        extractionObject.data = extractionObject.data.slice(0, 10);
      }
      return extractionObject;
    };

    documentObject.headerExtractions = searchFields.filter(function(object) {
      return object.result === 'header';
    }).map(function(object) {
      return truncateFunction(getHighlightedExtractionObjectFromResult(result, object, highlightMapping));
    });

    documentObject.detailExtractions = searchFields.filter(function(object) {
      return object.result === 'detail';
    }).map(function(object) {
      return truncateFunction(getHighlightedExtractionObjectFromResult(result, object, highlightMapping));
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
      highlightedText: descriptionHighlight,
      text: documentObject.description
    });

    if(documentObject.cached) {
      documentObject.details.push({
        name: 'Cached Ad Webpage',
        link: documentObject.cached,
        text: 'Open'
      });
    }

    // TODO Images

    return documentObject;
  }

  function createDateObjectFromBucket(dateBucket, config) {
    var newData = [];
    if (dateBucket && dateBucket[config.entity.key] && dateBucket[config.entity.key].buckets) {
      newData = dateBucket[config.entity.key].buckets.map(
                  function(entityBucket, index) {
                    return getExtraction(entityBucket, config.entity, index);
                  }
                ).filter(commonTransforms.getExtractionFilterFunction(config.entity.type))
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
    return buckets.reduce(function(histogram, dateBucket) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var count = dateBucket.doc_count;
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

      if(count) {
        var dateObject = createDateObjectFromBucket(dateBucket, config);

        var sum = dateObject.data.reduce(function(sum, entityObject) {
          return sum + entityObject.count;
        }, 0);

        if(sum < count) {
          dateObject.data.push(createUnidentifiedEntityObject(count - sum));
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