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

/* exported exportTransforms */
/* jshint camelcase:false */

var exportTransforms = (function(_) {
  return {
    createBulkSearchData: function(searchParameters, searchFields) {
      return _.keys(searchParameters).reduce(function(data, type) {
        _.keys(searchParameters[type]).filter(function(term) {
          return searchParameters[type][term].enabled;
        }).map(function(term) {
          return searchParameters[type][term].key;
        }).forEach(function(id) {
          data.push({
            field: searchFields[type].field,
            value: id
          });
        });
        return data;
      }, []);
    },

    createExportDataForCsv: function(searchData, searchFields) {
      var linkPrefix = window.location.hostname + ':' + window.location.port;
      var exportData = [];
      var header = ['Ad url', 'Dig url', 'Title'];

      searchFields.forEach(function(field) {
        if(field.result === 'header') {
          header.push(field.title);
        }
      });

      searchFields.forEach(function(field) {
        if(field.result === 'detail') {
          header.push(field.title);
        }
      });

      header.push('Description');
      header.push('Images');
      exportData.push(header);

      searchData.forEach(function(result) {
        var exportDataBody = [
            result.url,
            linkPrefix + result.link,
            result.title,
        ];
        var imageLinks = (result.images || []).map(function(image) {

          return image.source.replace('https://s3.amazonaws.com/', '');
        }).join('; ');

        result.headerExtractions.forEach(function(elementArray) {
          var data = '';
          elementArray.data.forEach(function(element) {
            data += element.text + "; "
          });

          exportDataBody.push(data);
        });

        result.detailExtractions.forEach(function(elementArray) {
          var data = '';
          elementArray.data.forEach(function(element) {
            data += element.text + "; "
          });

          exportDataBody.push(data);
        });

        exportDataBody.push(result.description.replace(/\s/g, ' '));
        exportDataBody.push(imageLinks);
        exportData.push(exportDataBody);

        console.log(exportData);
      });

      return exportData;
    },

    createExportDataForPdf: function(searchData) {
      var linkPrefix = window.location.hostname + ':' + window.location.port;
      var exportData = [];
      var nextId = 1;
      searchData.forEach(function(result) {
        var item = {
          images: (result.images || []).map(function(image) {
            return {
              id: 'image' + nextId++,
              source: encodeURIComponent(image.source.replace('https://s3.amazonaws.com/', '')),
              text: image.source
            };
          }),
          paragraphs: [{
            big: true,
            label: result.title,
            value: ''
          }, {
            label: 'URL:  ',
            value: result.url
          }, {
            label: 'DIG URL:  ',
            value: linkPrefix + result.link
          }]
        };

        result.headerExtractions.forEach(function(elementArray) {
          var data = '';
          elementArray.data.forEach(function(element) {
            data += element.text + ', ';
          });

          data = data.substring(0, data.length - 2);

          if(data !== '') {
            item.paragraphs.push({
              label: elementArray.key + ': ',
              value: data
            });
          }
        });

        result.detailExtractions.forEach(function(elementArray) {
          var data = '';
          elementArray.data.forEach(function(element) {
            data += element.text + ', ';
          });

          data = data.substring(0, data.length - 2);

          if(data !== '') {
            item.paragraphs.push({
              label: elementArray.key + ': ',
              value: data
            });
          }
        });

        item.paragraphs.push({
          label: 'Description:  ',
          value: result.description.replace(/\n/g, ' ')
        });

        exportData.push(item);
      });
      return exportData;
    }
  };
});
