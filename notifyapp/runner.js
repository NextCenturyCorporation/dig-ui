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

/*
 * The purpose of this module for executing Saved Scheduled Queries (SSQ) 
 * to determine whether to set a notification.
 */

module.exports = function(logger, client, userIndexName, userIndexType, dataIndexName, dataIndexType, dateField, sendAlertEmailCallback) {
  logger.info('User Index Name ' + userIndexName);
  logger.info('User Index Type ' + userIndexType);
  logger.info('Data Index Name ' + dataIndexName);
  logger.info('Data Index Type ' + dataIndexType);
  logger.info('Date Field ' + dateField);
  logger.info('Send Alert Email Callback ' + (sendAlertEmailCallback ? 'Defined' : 'Undefined'));

  var createEntityArguments = function(entity) {
    var data = {
      body: {
        query: {
          term: {}
        },
        sort: {}
      },
      size: 1,
      sort: dateField + ':desc'
    };
    data.body.query.term[entity.field] = entity.id;
    data.body.sort[dateField] = {
      order: 'desc'
    };
    logger.info('Entity ES arguments ' + JSON.stringify(data));
    return data;
  };

  var createSearchArguments = function(search) {
    var data = {
      body: {
        query: JSON.parse(search.esState),
        sort: {}
      },
      size: 1,
      sort: dateField + ':desc'
    };
    data.body.sort[dateField] = {
      order: 'desc'
    };
    logger.info('Search ES arguments ' + JSON.stringify(data));
    return data;
  };

  var checkResults = function(object, results) {
    if(results.hits.hits.length) {
      // Check the date of the newest item and compare it with the date on which the case was last run.
      var newestResultDateString = results.hits.hits[0]._source[dateField];
      var newestResultDateObject = new Date(newestResultDateString);
      logger.info('Newest result ' + newestResultDateObject.toUTCString());
      var lastViewedDateObject = new Date(object.lastViewedByUser);
      // Zero the hours/minutes/seconds for the date.
      // lastViewedDateObject = new Date(lastViewedDateObject.getFullYear(), lastViewedDateObject.getMonth(), lastViewedDateObject.getDate(), 0, 0, 0);
      logger.info('Last viewed by user ' + lastViewedDateObject.toUTCString());

      if(newestResultDateObject.getTime() >= lastViewedDateObject.getTime()) {
        if(!object.notify) {
          logger.info('Setting new alert.');
          // Set the newAlert property so the app will send an email alert (only send an email alert if it was not previously sent).
          object.newAlert = true;
          // Update the flag so the UI knows to show an alert.
          object.notify = true;
        }
      }
    } else {
      logger.info('No elasticsearch hits!');
    }

    // Update the last automated run date.
    object.lastAutomatedRun = new Date();

    return object;
  };

  var checkObjects = function(objects, checkedSearches, type, callback) {
    if(!objects.length) {
      callback(checkedSearches);
      return;
    }

    var done = function(object) {
      // Add the object to the checked object list.  Then check the next object.
      checkedSearches.push(object);
      checkObjects(objects.slice(1), checkedSearches, type, callback);
    };

    var object = objects[0];
    var args = (type === 'Entity' ? createEntityArguments(object) : createSearchArguments(object));

    logger.info(type + ' ' + (type === 'Entity' ? object.name : object.uiState));

    client.search({
      body: args.body,
      index: dataIndexName,
      size: args.size,
      sort: args.sort,
      type: dataIndexType
    }).then(function(results) {
      // Check the results of the case for new items.
      done(checkResults(object, results));
    }, function(error) {
      logger.error(error, 'Error running ' + type);
      done(object);
    });
  };

  var checkCases = function(cases, checkedCases, callback) {
    if(!cases.length) {
      callback(checkedCases);
      return;
    }

    var done = function(caseItem) {
      // Add the case to the checked case list.  Then check the next case.
      checkedCases.push(caseItem);
      checkCases(cases.slice(1), checkedCases, callback);
    };

    var caseItem = cases[0];

    logger.info('Case ' + caseItem.name);
    logger.info('Case Alerts ' + (caseItem.sendEmailAlert ? 'Yes' : 'No'));
    logger.info('Case Entity Length ' + caseItem.entityList.length);
    logger.info('Case Search Length ' + caseItem.searchList.length);

    // Check if we need to run the case.
    if(caseItem.sendEmailAlert) {
      checkObjects(caseItem.searchList, [], 'Search', function() {
        checkObjects(caseItem.entityList, [], 'Entity', function() {
          done(caseItem);
        });
      });
    } else {
      done(caseItem);
    }
  };

  var sendAlertEmailIfNeeded = function(user, checkedCases, callback) {
    var caseAlerts = checkedCases.filter(function(caseItem) {
      var alerts = (caseItem.entityList.filter(function(entity) {
        return entity.newAlert;
      })).concat(caseItem.searchList.filter(function(search) {
        return search.newAlert;
      }));
      return alerts.length;
    }).map(function(caseItem) {
      return caseItem.name;
    });

    if(sendAlertEmailCallback && user._source.emailAddress && caseAlerts.length) {
      sendAlertEmailCallback(user._source.emailAddress, caseAlerts, function(error, response) {
        if(error) {
          logger.error(error);
        }
        callback();
      });
    } else {
      callback();
    }
  };

  var updateUser = function(user, checkedCases, callback) {
    logger.info('Starting update of user ' + user._source.username + ' with ID ' + user._id);

    // Delete the newAlert property from the entities/searches because it is only used in the app.
    var caseList = checkedCases.map(function(caseItem) {
      caseItem.entityList = caseItem.entityList.map(function(entity) {
        delete entity.newAlert;
        return entity;
      });
      caseItem.searchList = caseItem.searchList.map(function(search) {
        delete search.newAlert;
        return search;
      });
      return caseItem;
    });

    // Update the cases for the user in the database.
    client.update({
      index: userIndexName,
      type: userIndexType,
      id: user._id,
      body: {
        doc: {
          caseList: caseList
        }
      }
    }, function(error, response) {
      if(error) {
        logger.error(error, 'Error in update of user ' + user._source.username + ' with ID ' + user._id);
      }
      callback();
    });
  };

  var checkAndSaveNextUser = function(users, period) {
    if(!users.length) {
      return;
    }

    var done = function() {
      // Check the cases for the next user.
      checkAndSaveNextUser(users.slice(1), period);
    };

    var user = users[0];
    var cases = user._source.caseList || [];

    logger.info('User ' + user._source.username);
    logger.info('ID ' + user._id);
    logger.info('Interval ' + user._source.notificationInterval);
    logger.info('Case List Length ' + cases.length);

    // Check the interval for the user.
    if(user._source.notificationInterval === period && cases.length) {
      checkCases(cases, [], function(checkedCases) {
        sendAlertEmailIfNeeded(users[0], checkedCases, function() {
          updateUser(user, checkedCases, done);
        });
      });
    } else {
      done();
    }
  };

  var checkUsers = function(period) {
    return function() {
      logger.info('------------------------------------------------------------');
      logger.info('Period ' + period);
      // Get the list of all users.  Set the size to an arbitrary big number.
      client.search({
        index: userIndexName,
        type: userIndexType,
        body: {},
        size: 10000
      }).then(function(users) {
        logger.info('Checking ' + users.hits.hits.length + ' Users...');
        checkAndSaveNextUser(users.hits.hits, period);
        logger.info('Done checking period ' + period);
      }, function(error) {
        logger.error(error, 'Error getting users!');
      });
    };
  };

  return {
    checkUsersMinutely: checkUsers('minutely'),
    checkUsersHourly: checkUsers('hourly'),
    checkUsersDaily: checkUsers('daily'),
    checkUsersWeekly: checkUsers('weekly')
  };
};
