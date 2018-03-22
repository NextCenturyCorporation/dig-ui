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

/* exported exportTransforms */
/* jshint camelcase:false */

var exportTransforms = (function(_, esConfig) {
  return {
    createBulkSearchData: function(searchParameters, searchFields) {
      if(!searchParameters || !searchFields) {
        return [];
      }

      return searchFields.reduce(function(bulkData, searchFieldsObject) {
        _.keys(searchParameters[searchFieldsObject.key] || {}).filter(function(term) {
          return searchParameters[searchFieldsObject.key][term].enabled;
        }).map(function(term) {
          return searchParameters[searchFieldsObject.key][term].key;
        }).forEach(function(id) {
          bulkData.push({
            field: searchFieldsObject.queryField,
            value: id
          });
        });
        return bulkData;
      }, []);
    },

    createExportDataForCsv: function(searchData, searchFields) {
      if(!searchData || !searchFields) {
        return [];
      }

      var linkPrefix = window.location.hostname + ':' + window.location.port;
      var exportData = [];
      var exportDataHeader = [esConfig.webpageField.title, 'DIG URL', 'Title'];

      var keysToArrayIndexes = {};

      searchFields.forEach(function(field) {
        if(field.result === 'header') {
          keysToArrayIndexes[field.key] = exportDataHeader.length;
          exportDataHeader.push(field.title);
        }
      });

      searchFields.forEach(function(field) {
        if(field.result === 'detail') {
          keysToArrayIndexes[field.key] = exportDataHeader.length;
          exportDataHeader.push(field.title);
        }
      });

      exportDataHeader.push('Description');
      exportDataHeader.push('Images');
      exportData.push(exportDataHeader);

      searchData.forEach(function(result) {
        var imageLinks = (result.images || []).map(function(image) {
          return image.source;
        }).join(', ');

        var exportDataBody = new Array(exportDataHeader.length);
        exportDataBody[0] = result.url;
        exportDataBody[1] = linkPrefix + result.link;
        exportDataBody[2] = result.title;
        exportDataBody[exportDataHeader.length - 2] = result.description.replace(/\s/g, ' ').trim();
        exportDataBody[exportDataHeader.length - 1] = imageLinks;

        result.headerExtractions.forEach(function(elementArray) {
          var data = elementArray.data.reduce(function(terms, element, index) {
            return terms + (index ? ', ' : '') + element.text;
          }, '');
          exportDataBody[keysToArrayIndexes[elementArray.key]] = data;
        });

        result.detailExtractions.forEach(function(elementArray) {
          var data = elementArray.data.reduce(function(terms, element, index) {
            return terms + (index ? ', ' : '') + element.text;
          }, '');
          exportDataBody[keysToArrayIndexes[elementArray.key]] = data;
        });

        exportData.push(exportDataBody);
      });

      return exportData;
    },

    createExportDataForPdf: function(searchData, searchFields) {
      if(!searchData || !searchFields) {
        return [];
      }

      var linkPrefix = window.location.hostname + ':' + window.location.port;
      var exportData = [];
      var nextId = 1;

      var keysToTitles = {};
      searchFields.forEach(function(field) {
        keysToTitles[field.key] = field.title;
      });

      searchData.forEach(function(result) {
        var item = {
          images: (result.images || []).map(function(image) {
            return {
              id: 'image' + nextId++,
              source: image.downloadSource,
              text: image.source
            };
          }),
          paragraphs: [{
            big: true,
            label: result.title,
            value: ''
          }, {
            label: esConfig.webpageField.title + ':  ',
            value: result.url
          }, {
            label: 'DIG URL:  ',
            value: linkPrefix + result.link
          }]
        };

        result.headerExtractions.forEach(function(elementArray) {
          var data = elementArray.data.reduce(function(terms, element, index) {
            return terms + (index ? ', ' : '') + element.text;
          }, '');

          if(data !== '') {
            item.paragraphs.push({
              label: keysToTitles[elementArray.key] + ': ',
              value: data
            });
          }
        });

        result.detailExtractions.forEach(function(elementArray) {
          var data = elementArray.data.reduce(function(terms, element, index) {
            return terms + (index ? ', ' : '') + element.text;
          }, '');

          if(data !== '') {
            item.paragraphs.push({
              label: keysToTitles[elementArray.key] + ': ',
              value: data
            });
          }
        });

        item.paragraphs.push({
          label: 'Description:  ',
          value: result.description.replace(/\t/g, ' ').trim()
        });

        exportData.push(item);
      });

      return exportData;
    }
  };
});
