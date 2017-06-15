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

var clientConfig = fs.existsSync('./server/clientConfig.json') ? require('./clientConfig.json') : {key:'value'};
var serverConfig = require('./config/environment');

module.exports = function(app) {
  app.get('/serverConfig/?', function(req, res) {
    res.status(200).send({
      appVersion: serverConfig.appVersion,
      username: req.headers.user ? req.headers.user : 'username',
      configEndpoint: serverConfig.configEndpoint,
      configPassword: serverConfig.configPassword,
      configUsername: serverConfig.configUsername,
      esHost: serverConfig.esHost,
      esIndex: serverConfig.esIndex,
      esType: serverConfig.esType,
      searchEndpoint: serverConfig.searchEndpoint
    });
  });

  app.get('/clientConfigEntities/?', function(req, res) {
    res.status(200).send(clientConfig.entities || {});
  });

  app.get('/clientConfigFields/?', function(req, res) {
    res.status(200).send(clientConfig.fields || {});
  });

  app.post('/saveClientConfig', function(req, res) {
    if(req.body) {
      clientConfig = req.body;
      fs.writeFile('./server/clientConfig.json', JSON.stringify(req.body, null, 2), function(err) {
        console.log(err);
      });
    }
    res.status(200).send();
  });

  app.route('/*').get(function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
  });
};
