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

/* globals _, DigBehaviors */
/* exported DigBehaviors */
var DigBehaviors = DigBehaviors || {};

/**
 * Polymer behavior for DIG page utility functions.
 */
DigBehaviors.PageBehavior = {
  assignWindowProperties: function(self) {
    window.onpopstate = function() {
      // TODO: refreshing for now. Need to address issues with interrupting logging entries -- perhaps a better
      // approach would to be not to reload the page, but to rerun the query with the changed parameters + make
      // sure logging is done correctly in this case, which may involve adding processRequest to create-log-message.
      window.location.reload();
    };

    window.onload = function() {
      if(window.history.state && window.history.state.stateHistory) {
        self.set('stateHistory', window.history.state.stateHistory);
      }
    };
  },

  /**
   * Builds and returns an array of all the non-null/non-undefined arguments.  Concatenates the array arguments.
   *
   * @return {Array}
   */
  buildArray: function() {
    var array = [];
    _.each(arguments, function(value) {
      if(_.isArray(value)) {
        value.forEach(function(innerValue) {
          if(!_.isUndefined(innerValue)) {
            array.push(innerValue);
          }
        });
      } else if(!_.isUndefined(value)) {
        array.push(value);
      }
    });
    return array;
  },

  /**
   * Builds and returns an array of all the arguments if all are non-null/non-undefined; otherwise returns an empty array.  Concatenates the array arguments.
   *
   * @return {Array}
   */
  buildArrayIfAllExist: function() {
    var array = [];
    var empty = false;
    _.each(arguments, function(value) {
      if(_.isArray(value)) {
        if(!value.length) {
          empty = true;
        }
        value.forEach(function(innerValue) {
          if(!_.isUndefined(innerValue)) {
            array.push(innerValue);
          }
        });
      } else if(!_.isUndefined(value)) {
        array.push(value);
      } else {
        empty = true;
      }
    });
    return empty ? [] : array;
  },

  concat: function(one, two) {
    if(one && two) {
      return one + two;
    }
    return undefined;
  },

  createAuthHeader: function(serverConfig) {
    if(serverConfig.configUsername && serverConfig.configPassword) {
      return {
        'Authorization': 'Basic ' + btoa(serverConfig.configUsername + ':' + serverConfig.configPassword)
      };
    }
    return {};
  },

  createResetDatesFunction: function(searchFields) {
    return function(searchParameters, startDateString, endDateString) {
      searchFields.forEach(function(searchFieldsObject) {
        if(searchFieldsObject.isDate) {
          searchParameters[searchFieldsObject.key] = {};
          if(startDateString) {
            searchParameters[searchFieldsObject.key][searchFieldsObject.dateProperties.start.key] = {
              key: searchFieldsObject.dateProperties.start.key,
              category: searchFieldsObject.dateProperties.start.title,
              date: new Date(startDateString),
              enabled: true,
              search: 'required',
              text: startDateString
            };
          }
          if(endDateString) {
            searchParameters[searchFieldsObject.key][searchFieldsObject.dateProperties.end.key] = {
              key: searchFieldsObject.dateProperties.end.key,
              category: searchFieldsObject.dateProperties.end.title,
              date: new Date(endDateString),
              enabled: true,
              search: 'required',
              text: endDateString
            };
          }
        }
      });
      return searchParameters;
    };
  },

  equals: function(one, two) {
    return one === two;
  },

  exists: function(object) {
    return typeof object !== 'undefined';
  },

  findBlurStyleClass: function(blur, large) {
    return (blur ? (large ? 'large-blur' : 'small-blur') : '');
  },

  findDigUrl: function(prefix, link) {
    return prefix + link;
  },

  findDomain: function(parameters, serverConfig) {
    if(parameters && serverConfig) {
      /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
      var override = serverConfig.overrideConfig ? serverConfig.overrideConfig.project_name : '';
      /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */
      return override || parameters.domain || parameters.project || serverConfig.defaultProject;
    }
    return undefined;
  },

  findPrettyDomain: function(domain, serverConfig) {
    return (serverConfig && serverConfig.prettyDomain ? serverConfig.prettyDomain[domain] : domain) || domain;
  },

  getSourceIncludes: function(ignore, timestamp, uid) {
    return ignore ? [] : ['knowledge_graph', 'objects', 'tld', 'url'].concat(timestamp || []).concat(uid || []);
  },

  getUrlParameters: function() {
    return DigBehaviors.PageBehavior.getUrlParametersHelper(window.location.search);
  },

  getUrlParametersHelper: function(parameterInput) {
    var parameters = {};
    if(parameterInput && parameterInput !== '?') {
      (parameterInput.indexOf('?') === 0 ? parameterInput.slice(1) : parameterInput).split('&').forEach(function(parameter) {
        var parameterSplit = parameter.split('=');
        parameters[parameterSplit[0]] = (parameterSplit.length > 1 ? parameterSplit[1] : true);
      });
    }
    return parameters;
  },

  openHelpPage: function() {
    this.$$('#menuDropdown').close();
    window.open('./help.html');
  },

  openNewTab: function() {
    window.open('./?project=' + this.domain);
  },

  openSaveDialog: function() {
    this.$$('#menuDropdown').close();
    this.$$('#saveDialog').open();
  },

  openStateHistoryDialog: function() {
    this.$$('#menuDropdown').close();
    this.$$('#stateManager').openStateHistory();
  },

  openTagsDialog: function() {
    this.$$('#menuDropdown').close();
    this.$$('#tagManager').openDialog();
  },

  sendSupportEmail: function() {
    if(this.serverConfig.supportEmail) {
      window.open('mailto:' + this.serverConfig.supportEmail);
    }
  },

  toggleMenu: function() {
    if(this.$$('#menuDropdown').style.display === 'none') {
      this.$$('#menuDropdown').open();
    } else {
      this.$$('#menuDropdown').close();
    }
  }
};
