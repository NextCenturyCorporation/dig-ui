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
* Main application routes
*/

'use strict';

var csvWriteStream = require('csv-write-stream');
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var request = require('request');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({
  storage: storage
});

var clientConfig = {};
var serverConfig = require('./config/environment');
var serverPath = serverConfig.pathPrefix ? serverConfig.pathPrefix : '/';
if(serverPath.indexOf('/') !== 0) {
  serverPath = '/' + serverPath;
}
if(serverPath.lastIndexOf('/') !== (serverPath.length - 1)) {
  serverPath += '/';
}

module.exports = function(app) {
  app.use(function(req, res, next) {
    var userAgent = req.headers['user-agent'];
    if(userAgent.indexOf('Edge') >= 0 || userAgent.indexOf('MSIE') >= 0 || userAgent.indexOf('Trident') >= 0) {
      res.sendFile(path.resolve(app.get('appPath') + '/unsupported.html'));
    } else {
      next();
    }
  });

  app.use(function(req, res, next) {
    // If auth is false, or the user is being redirected to the login page, continue to the next step.
    if(!serverConfig.auth || req.session.login) {
      next();
      return;
    }

    // If the user is unauthorized (and is not already redirected to the login page), redirect to the login page.
    if(!req.query.access_token && !req.session.token && !req.session.login) {
      req.session.login = true;
      res.redirect(serverPath + 'login' + req.originalUrl);
      return;
    }

    // For all other requests, validate the user's authorization before continuing to the request.
    var token = (req.query.access_token ? decodeURIComponent(req.query.access_token) : req.session.token);
    request(serverConfig.authTokenUrl + encodeURIComponent(token), function(error, response, body) {
      // Clone the URL without the query token.
      var url = req.originalUrl.split(/[?&]access_token=/)[0];
      // If the token is invalid, redirect to the login page.
      var data = body ? JSON.parse(body) : {
        error: 'undefined'
      };
      if(data.error) {
        console.log('Token Error', data.error);
        req.session.token = undefined;
        res.redirect(serverPath + 'login' + url);
        return;
      }
      // If the token is in the URL, save the token and redirect to the URL without the query token.
      if(req.query.access_token) {
        req.session.token = token;
        req.session.username = data.email;
        res.redirect(url);
      }
      else {
        // Continue to the next step.
        next();
      }
    });
  });

  app.get(serverPath + 'login/*', function(req, res) {
    var redirectBackTo = req.protocol + '://' + req.get('host') + req.originalUrl.substring(('/login').length);
    req.session.login = false;
    res.redirect(serverConfig.authLoginUrl + encodeURIComponent(redirectBackTo));
  });

  app.get(serverPath + 'file/:file', function(req, res) {
    res.download(req.params.file);
  });

  app.get(serverPath + 'downloadImage/:id', function(req, res) {
    // Image URL used in testing.  Image URL used in development is set by DOWNLOAD_IMAGE_URL.
    var link = 'https://content.tellfinder.com/image/' + decodeURIComponent(req.params.id) + '.jpg';
    req.pipe(request(link)).pipe(res);
  });

  app.get('/dig-ui/config/?', function(req, res) {
    // Whenever a page is loaded, initialize the DIG elasticsearch indices if needed.
    if(serverConfig.esHostString) {
      exec('./scripts/create_dig_indices.sh ' + serverConfig.esHostString, function(error, stdout, stderr) {
        if(!error) {
          console.log(stdout);
          console.log('Validation of DIG elasticsearch indices SUCCESSFUL');
        } else {
          console.log('Validation of DIG elasticsearch indices FAILED');
          console.log(error);
        }
      });
    }

    res.status(200).send({
      appVersion: serverConfig.appVersion,
      username: serverConfig.userOverride || req.session.username || req.headers.user || '',
      configEndpoint: serverConfig.configEndpoint,
      configPassword: serverConfig.configPassword,
      configUsername: serverConfig.configUsername,
      databaseType: serverConfig.databaseType,
      defaultProject: serverConfig.defaultProject,
      downloadImageUrl: serverConfig.downloadImageUrl,
      esHost: serverConfig.esHost,
      hideBulkSearch: serverConfig.hideBulkSearch,
      hideCachedPage: serverConfig.hideCachedPage,
      hideDatabaseInfo: serverConfig.hideDatabaseInfo,
      imageServiceConfig: serverConfig.imageServiceConfig,
      imageUrlPrefix: serverConfig.imageUrlPrefix,
      imageUrlSuffix: serverConfig.imageUrlSuffix,
      logIndexName: serverConfig.logIndexName,
      logIndexType: serverConfig.logIndexType,
      masterOverride: serverConfig.masterOverride,
      overrideConfig: serverConfig.overrideConfig,
      overrideSearchEndpoint: serverConfig.overrideSearchEndpoint,
      pathPrefix: serverPath,
      prettyDomain: serverConfig.prettyDomain,
      profileIndexName: serverConfig.profileIndexName,
      profileIndexType: serverConfig.profileIndexType,
      resultIcon: serverConfig.resultIcon,
      resultNamePlural: serverConfig.resultNamePlural,
      resultNameSingular: serverConfig.resultNameSingular,
      resultQueryField: serverConfig.resultQueryField,
      revisionsField: serverConfig.revisionsField,
      revisionsLabel: serverConfig.revisionsLabel,
      searchConfig: serverConfig.searchConfig,
      sendSearchesDirectlyToES: serverConfig.sendSearchesDirectlyToES,
      showEsData: serverConfig.showEsData,
      showMultipleDescriptions: serverConfig.showMultipleDescriptions,
      showMultipleTitles: serverConfig.showMultipleTitles,
      stateIndexName: serverConfig.stateIndexName,
      stateIndexType: serverConfig.stateIndexType,
      supportEmail: serverConfig.supportEmail,
      tagsEntityEndpoint: serverConfig.tagsEntityEndpoint,
      tagsExtractionEndpoint: serverConfig.tagsExtractionEndpoint,
      tagsListEndpoint: serverConfig.tagsListEndpoint,
      timestampField: serverConfig.timestampField,
      uidField: serverConfig.uidField
    });
  });

  app.post(serverPath + 'export', function(req, res) {
    if(req.body && req.body.length > 1) {
      var filename = req.body[0] + '.csv';
      var header = req.body[1];
      var writer = csvWriteStream({
        headers: header
      });
      writer.pipe(fs.createWriteStream(filename));
      var done = false;
      var call = 0;
      writer.on('data', function(stuff) {
        ++call;
        if(done && call > (req.body.length - 2)) {
          // Unset done so the response is not sent twice.
          done = false;
          writer.end();
          res.status(200).set('Cache-Control', 'no-cache').send(serverPath + 'file/' + filename);
        }
      });
      for(var i = 2; i < req.body.length; ++i) {
        writer.write(req.body[i]);
      }
      done = true;
      // Write once more because sometimes the data is processed before setting done.
      writer.write('');
    } else {
      res.status(200).send();
    }
  });

  app.post(serverPath + 'upload', upload.array('file'), function(req, res) {
    res.status(200).send(req.files[0].buffer.toString());
  });

  app.post(serverPath + 'uploadImage', upload.array('file'), function(req, res) {
      res.status(200).send({mimeType: req.files[0].mimetype, base64: req.files[0].buffer.toString('base64')});
  });

  // Deprecated
  app.get(serverPath + 'document.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/result.html'));
  });

  app.get(serverPath + 'cached.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/cached.html'));
  });

  app.get(serverPath + 'entity.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/entity.html'));
  });

  app.get(serverPath + 'help.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/help.html'));
  });

  app.get(serverPath + 'result.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/result.html'));
  });

  app.get(serverPath + 'search.html', function(req, res) {
    res.sendFile(path.resolve(app.get('appPath') + '/search.html'));
  });

  app.get('/*', function(req, res) {
    res.redirect(serverPath + 'search.html');
  });
};
