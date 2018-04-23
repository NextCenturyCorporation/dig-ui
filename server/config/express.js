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

/**
 * Express configuration
 */

'use strict';

var express = require('express');
var session = require('express-session');
var MemoryStore = require('memorystore')(session);
var favicon = require('serve-favicon');
var morgan = require('morgan');
var compression = require('compression');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');
var path = require('path');
var serverConfig = require('./environment');
var serverPath = serverConfig.pathPrefix ? serverConfig.pathPrefix : '/';
if(serverPath.indexOf('/') !== 0) {
  serverPath = '/' + serverPath;
}
if(serverPath.lastIndexOf('/') !== (serverPath.length - 1)) {
  serverPath += '/';
}

module.exports = function(app) {
  var env = app.get('env');

  app.set('views', serverConfig.root + '/server/views');
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  app.use(compression());
  app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: serverConfig.secret,
    store: new MemoryStore({
      checkPeriod: 86400000
    })
  }));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.urlencoded({
    extended: true,
    limit: '100gb'
  }));
  app.use(bodyParser.json({
    limit: '100gb'
  }));
  app.use(methodOverride());
  
  if ('production' === env) {
    // Add paths to static files.  Do NOT add paths to search/entity pages because they must be loaded through the router with proper auth.
    app.use(serverPath + 'behaviors', express.static(path.join(serverConfig.root, 'dist/behaviors')));
    app.use(serverPath + 'bower_components', express.static(path.join(serverConfig.root, 'dist/bower_components')));
    app.use(serverPath + 'elements', express.static(path.join(serverConfig.root, 'dist/elements')));
    app.use(serverPath + 'images', express.static(path.join(serverConfig.root, 'dist/images')));
    app.use(serverPath + 'styles', express.static(path.join(serverConfig.root, 'dist/styles')));
    app.use(serverPath + 'transforms', express.static(path.join(serverConfig.root, 'dist/transforms')));
    app.use('/dig-ui/dig-logo.png', express.static(path.join(serverConfig.root, 'dist/dig-logo.png')));
    app.use('/dig-ui/dig-logo-bigger.png', express.static(path.join(serverConfig.root, 'dist/dig-logo-bigger.png')));
    app.use(favicon(path.join(serverConfig.root, 'dist/favicon.ico')));
    // Set appPath for use by the router.
    app.set('appPath', path.join(serverConfig.root, 'dist'));
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }

  if ('development' === env || 'test' === env) {
    // Add paths to static files.  Do NOT add paths to search/entity pages because they must be loaded through the router with proper auth.
    app.use(serverPath + 'behaviors', express.static(path.join(serverConfig.root, 'app/behaviors')));
    app.use(serverPath + 'bower_components', express.static(path.join(serverConfig.root, 'app/bower_components')));
    app.use(serverPath + 'elements', express.static(path.join(serverConfig.root, 'app/elements')));
    app.use(serverPath + 'images', express.static(path.join(serverConfig.root, 'app/images')));
    app.use(serverPath + 'styles', express.static(path.join(serverConfig.root, 'app/styles')));
    app.use(serverPath + 'transforms', express.static(path.join(serverConfig.root, 'app/transforms')));
    app.use('/dig-ui/dig-logo.png', express.static(path.join(serverConfig.root, 'app/dig-logo.png')));
    app.use('/dig-ui/dig-logo-bigger.png', express.static(path.join(serverConfig.root, 'app/dig-logo-bigger.png')));
    app.use(favicon(path.join(serverConfig.root, 'app/favicon.ico')));
    // Set appPath for use by the router.
    app.set('appPath', path.join(serverConfig.root, 'app'));
    app.use(morgan('dev'));
    app.use(errorHandler()); // Error handler - has to be last
  }
};
