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

'use strict';

var path = require('path');
var _ = require('lodash');
var pjson = require('../../../package.json');

module.exports = {
    env: process.env.NODE_ENV,

    // Root path of server
    root: path.normalize(__dirname + '/../../..'),

    // Server port
    port: process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 9000),

    // Server IP
    ip: process.env.IP || (process.env.NODE_ENV === 'production' ? undefined : '0.0.0.0'),

    appVersion: pjson.version,

    configEndpoint: process.env.CONFIG_ENDPOINT,
    configPassword: process.env.CONFIG_PASSWORD || '',
    configUsername: process.env.CONFIG_USERNAME || '',
    esHost: JSON.parse(process.env.ES_HOST || '{"host":"http://localhost:9200"}'),
    esIndex: process.env.ES_INDEX,
    esType: process.env.ES_TYPE,
    searchEndpoint: process.env.SEARCH_ENDPOINT,
    imageServiceAuth: process.env.IMAGE_SERVICE_AUTH || '{"user": "", "password": ""}',
    imageServiceHost: process.env.IMAGE_SERVICE_HOST || '{"url": "", "base64": ""}',
};
