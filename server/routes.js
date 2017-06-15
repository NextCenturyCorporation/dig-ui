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

var config = require('./config/environment');
var path = require('path');

module.exports = function(app) {
  app.get('/config/?', function(req, res) {
    res.status(200).send({
      appVersion: config.appVersion,
      username: req.headers.user ? req.headers.user : 'username',
      configEndpoint: config.configEndpoint,
      configPassword: config.configPassword,
      configUsername: config.configUsername,
      esHost: config.esHost,
      esIndex: config.esIndex,
      esType: config.esType,
      searchEndpoint: config.searchEndpoint
    });
  });

  app.route('/*').get(function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/index.html'));
  });
};
