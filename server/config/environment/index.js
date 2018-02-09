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

'use strict';

var path = require('path');
var _ = require('lodash');
var pjson = require('../../../package.json');

module.exports = {
    env: process.env.NODE_ENV,

    // Root path of server
    root: path.normalize(__dirname + '/../../..'),

    // Server port
    port: process.env.PORT || (process.env.NODE_ENV === 'production' ? 8080 : 5009),

    // Server IP
    ip: process.env.IP || (process.env.NODE_ENV === 'production' ? undefined : '0.0.0.0'),

    appVersion: pjson.version,

    auth: process.env.AUTH || false,
    authLoginUrl: process.env.AUTH_LOGIN_URL,
    authTokenUrl: process.env.AUTH_TOKEN_URL,
    configEndpoint: process.env.CONFIG_ENDPOINT || 'http://localhost:1234',
    configPassword: process.env.CONFIG_PASSWORD || '',
    configUsername: process.env.CONFIG_USERNAME || '',
    databaseType: process.env.DATABASE_TYPE || 'sample',
    defaultProject: process.env.DEFAULT_PROJECT,
    downloadImageUrl: process.env.DOWNLOAD_IMAGE_URL || 'downloadImage',
    esHost: JSON.parse(process.env.ES_HOST || '{"apiVersion":"2.4","host":"http://localhost:9200"}'),
    esHostString: process.env.ES_HOST_STRING || '',
    imageServiceConfig: JSON.parse(process.env.IMAGE_SERVICE_CONFIG || '{"auth":{},"endpoint":{},"host":{}}'),
    imageUrlPrefix: process.env.IMAGE_URL_PREFIX || '',
    imageUrlSuffix: process.env.IMAGE_URL_SUFFIX || '',
    logIndexName: process.env.LOG_INDEX_NAME || 'dig-logs',
    logIndexType: process.env.LOG_INDEX_TYPE || 'log',
    overrideConfig: process.env.OVERRIDE_CONFIG ? JSON.parse(process.env.OVERRIDE_CONFIG) : undefined,
    overrideSearchEndpoint: process.env.OVERRIDE_SEARCH_ENDPOINT ? JSON.parse(process.env.OVERRIDE_SEARCH_ENDPOINT) : undefined,
    pathPrefix: process.env.PATH_PREFIX || '',
    prettyDomain: process.env.PRETTY_DOMAIN ? JSON.parse(process.env.PRETTY_DOMAIN) : undefined,
    profileIndexName: process.env.PROFILE_INDEX_NAME || 'dig-profiles',
    profileIndexType: process.env.PROFILE_INDEX_TYPE || 'profile',
    searchConfig: process.env.SEARCH_CONFIG ? JSON.parse(process.env.SEARCH_CONFIG) : undefined,
    secret: process.env.SECRET || 'dig memex',
    sendSearchesDirectlyToES: process.env.SEND_SEARCHES_DIRECTLY_TO_ES || false,
    stateIndexName: process.env.STATE_INDEX_NAME || 'dig-states',
    stateIndexType: process.env.STATE_INDEX_TYPE || 'state',
    tagsEntityEndpoint: process.env.TAGS_ENTITY_ENDPOINT,
    tagsExtractionEndpoint: process.env.TAGS_EXTRACTION_ENDPOINT,
    tagsListEndpoint: process.env.TAGS_LIST_ENDPOINT
};
