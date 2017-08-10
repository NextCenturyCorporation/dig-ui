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

/**
* Main application routes
*/

'use strict';

var fs = require('fs');
var path = require('path');

var clientConfig = {};
var csvWriteStream = require('csv-write-stream');
var serverConfig = require('./config/environment');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({
  storage: storage
});

module.exports = function(app) {
  app.get('/serverConfig/?', function(req, res) {
    res.status(200).send({
      appVersion: serverConfig.appVersion,
      username: req.headers.user ? req.headers.user : 'username',
      configEndpoint: serverConfig.configEndpoint,
      configPassword: serverConfig.configPassword,
      configUsername: serverConfig.configUsername,
      databaseType: serverConfig.databaseType,
      defaultProject: serverConfig.defaultProject,
      esHost: serverConfig.esHost,
      imageServiceAuth: serverConfig.imageServiceAuth,
      imageServiceHost: serverConfig.imageServiceHost,
      searchConfig: serverConfig.searchConfig,
      stateIndexName: serverConfig.stateIndexName,
      stateIndexType: serverConfig.stateIndexType,
      tagsEntityEndpoint: serverConfig.tagsEntityEndpoint,
      tagsExtractionEndpoint: serverConfig.tagsExtractionEndpoint,
      tagsListEndpoint: serverConfig.tagsListEndpoint
    });
  });

  app.get('/clientConfig/:domain', function(req, res) {
    if(!req.params.domain) {
      return res.status(200).send({});
    }
    if(!clientConfig[req.params.domain]) {
      var filename = 'client-config-' + req.params.domain + '.json';
      clientConfig[req.params.domain] = fs.existsSync('./server/' + filename) ? require('./' + filename) : {};
    }
    res.status(200).send(clientConfig[req.params.domain]);
  });

  app.post('/saveClientConfig/:domain', function(req, res) {
    if(req.params.domain && req.body) {
      clientConfig[req.params.domain] = req.body;
      fs.writeFile('./server/client-config-' + req.params.domain + '.json', JSON.stringify(req.body, null, 2), function(err) {
        console.log(err);
      });
    }
    res.status(200).send();
  });

  app.get('/file/:file', function(req, res) {
    res.download(req.params.file);
  });

  app.post('/export', function(req, res) {
    if(req.body && req.body.length > 1) {
      var filename = req.body[0] + '.csv';
      var header = req.body[1];
      var writer = csvWriteStream({
        headers: header
      });
      writer.pipe(fs.createWriteStream(filename));
      var index = 2;
      writer.on('data', function() {
        index++;
        if(index === req.body.length) {
          writer.end();
          res.status(200).set('Cache-Control', 'no-cache').send('/file/' + filename);
        }
      });
      for(var i = 2; i < req.body.length; ++i) {
        writer.write(req.body[i]);
      }
    } else {
      res.status(200).send();
    }
  });

  app.post('/uploadImage', upload.array('file'), function(req, res) {
      res.status(200).send({mimeType: req.files[0].mimetype, base64: req.files[0].buffer.toString('base64')});
  });

  app.route('/*').get(function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
  });
};
