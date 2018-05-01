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

/* exported commonTransforms */
/* jshint camelcase:false */

var commonTransforms = (function(_, moment, domain, pathPrefix) {
  /**
   * Returns the JS Date object for the given date string and the given date interval (hour/day/week/month/year).
   */
  function getDateForInterval(dateString, interval) {
    if(dateString) {
      var dateObject = new Date(dateString);
      if(interval !== 'hour') {
        dateObject.setUTCHours(0);
      }
      var momentObject = moment.utc(dateObject);
      if(interval === 'week') {
        momentObject.isoWeekday(1);
      }
      if(interval === 'month') {
        momentObject.date(1);
      }
      if(interval === 'year') {
        momentObject.dayOfYear(1);
      }
      return momentObject.toDate();
    }
    return null;
  }

  /**
   * Returns the hex color for the given color.
   */
  function getHexColor(color) {
    if(color === 'amber') {
      return '#ffb300'; /* paper-amber-600 */
    }
    if(color === 'blue') {
      return '#1e88e5'; /* paper-blue-600 */
    }
    if(color === 'blue-grey') {
      return '#546e7a'; /* paper-blue-grey-600 */
    }
    if(color === 'brown') {
      return '#6d4c41'; /* paper-brown-600 */
    }
    if(color === 'cyan') {
      return '#00acc1'; /* paper-cyan-600 */
    }
    if(color === 'deep-orange') {
      return '#f4511e'; /* paper-deep-orange-600 */
    }
    if(color === 'deep-purple') {
      return '#5e35b1'; /* paper-deep-purple-600 */
    }
    if(color === 'green') {
      return '#43a047'; /* paper-green-600 */
    }
    if(color === 'grey') {
      return '#757575'; /*paper-grey-600 */
    }
    if(color === 'indigo') {
      return '#3949ab'; /* paper-indigo-600 */
    }
    if(color === 'light-blue') {
      return '#039be5';  /* paper-light-blue-600 */
    }
    if(color === 'light-green') {
      return '#7cb342'; /* paper-light-green-600 */
    }
    if(color === 'lime') {
      return '#c0ca33'; /* paper-lime-600 */
    }
    if(color === 'orange') {
      return '#fb8c00'; /* paper-orange-600 */
    }
    if(color === 'pink') {
      return '#d81b60'; /* paper-pink-600 */
    }
    if(color === 'purple') {
      return '#8e24aa'; /* paper-purple-600 */
    }
    if(color === 'red') {
      return '#e53935'; /* paper-red-600 */
    }
    if(color === 'teal') {
      return '#00897b'; /* paper-teal-600 */
    }
    if(color === 'white') {
      return '#ffffff';
    }
    if(color === 'yellow') {
      return '#fdd835'; /* paper-yellow-600 */
    }
    return '#212121'; /*paper-grey-900 */
  }

  /**
   * Returns the formatted string for the given date number/string in UTC format.
   */
  function getFormattedDate(dateString, interval) {
    if(dateString) {
      return moment.utc(getDateForInterval(dateString, interval)).format('MMM D, YYYY');
    }
    return 'None';
  }

  /**
   * Returns the formatted telephone number.
   */
  function getFormattedPhone(phone) {
    var output = phone;
    // Remove United States or X country code.
    output = (output.indexOf('+1-') === 0 ? output.substring(output.indexOf('+1-') + 3) : output);
    output = (output.indexOf('+x-') === 0 ? output.substring(output.indexOf('+x-') + 3) : output);
    return output.replace(/(\d{0,4})-?(\d{3})(\d{3})(\d{4})/, function(match, p1, p2, p3, p4) {
      if(p2 && p3 && p4) {
        return (p1 ? p1 + '-' : '') + p2 + '-' + p3 + '-' + p4;
      }
      return p1 + p2 + p3 + p4;
    });
  }

  /**
   * Returns the source URL for the image with the given ID using the given config.
   */
  function getImageUrl(id, config) {
    if(!config) {
      return id;
    }
    return (config.imageUrlPrefix || '') + ('' + id).toUpperCase() + (config.imageUrlSuffix || '');
  }

  /**
   * Returns the link for the given ID.
   */
  function getLink(itemId, linkType, fieldType, fieldId) {
    if(linkType === 'cached') {
      return pathPrefix + 'cached.html?' + (domain ? 'domain=' + domain : '') + '&id=' + itemId;
    }
    if(linkType === 'result') {
      return pathPrefix + 'result.html?' + (domain ? 'domain=' + domain : '') + '&id=' + itemId;
    }
    if(itemId && linkType === 'entity') {
      return pathPrefix + 'entity.html?' + (domain ? 'domain=' + domain : '') + '&id=' + encodeURIComponent(itemId) + '&type=' + fieldId;
    }
    return undefined;
  }

  /**
   * Returns the link function for the field with the given settings.
   */
  function getLinkFunction(linkType, fieldType, fieldId) {
    return function(id) {
      return getLink(id, linkType, fieldType, fieldId);
    };
  }

  /**
   * Returns the location data from the given location key formatted as city:state:country:longitude:latitude.
   */
  function getLocationDataFromKey(rawKey) {
    var key = decodeURIComponent(rawKey);
    var keySplit = key ? key.split(':') : [];

    if(keySplit.length < 5) {
      return {
        city: key,
        text: key + ' (Bad Format)'
      };
    }

    var city = keySplit[0];
    var state = keySplit.length > 1 ? keySplit[1] : undefined;
    var country = keySplit.length > 2 ? keySplit[2] : undefined;
    var longitude = keySplit.length > 3 ? keySplit[3] : undefined;
    var latitude = keySplit.length > 4 ? keySplit[4] : undefined;
    var text = city ? (city + (state ? (', ' + state) : '')) : 'None';

    return {
      city: city,
      country: country,
      latitude: latitude,
      longitude: longitude,
      state: state,
      text: text
    };
  }

  /**
   * Returns the style class for the given color.
   */
  function getStyleClass(color) {
    return color ? (color.replace(/ /g, '-')) : '';
  }

  /**
   * Returns the text for the given unit.
   */
  function getUnit(unit) {
    if(unit === 'foot/inch') {
      return '';
    }
    if(unit === 'centimeter') {
      return 'cm';
    }
    if(unit === 'pound') {
      return 'lbs';
    }
    return unit;
  }

  /**
   * Returns the extraction data from the given hyphenated key formatted as text-key1:value1-key2:value2-key3:value3...
   */
  function getTextFromHyphenatedKey(key) {
    var keySplit = key ? key.split('-') : [];

    if(keySplit.length < 2) {
      return keySplit.length ? keySplit[0] : undefined;
    }

    var text = keySplit[0];
    var currency;
    var timeUnit;
    var site;
    var unit;

    for(var i = 1; i < keySplit.length; ++i) {
      if(keySplit[i].indexOf('unit:') === 0) {
        unit = getUnit(keySplit[i].split(':')[1]);
      }
      if(keySplit[i].indexOf('site:') === 0) {
        site = getUnit(keySplit[i].split(':')[1]);
      }
      if(keySplit[i].indexOf('time_unit:') === 0) {
        timeUnit = keySplit[i].split(':')[1];
      }
      if(keySplit[i].indexOf('currency:') === 0) {
        currency = keySplit[i].split(':')[1];
      }
    }

    if(unit) {
      text += ' ' + unit;
    }

    if(site) {
      text += ' (' + site + ')';
    }

    if(timeUnit || currency) {
      text += (currency ? ' ' + currency : '') + (timeUnit ? ' per ' + timeUnit + ' minutes' : '');
    }

    return text;
  }

  /**
   * Returns the ID for the facets data with the given key and type.
   */
  function getFacetsDataId(key, type) {
    if(type === 'id') {
      return key.substring(0, key.indexOf('-'));
    }
    if(type === 'email') {
      return decodeURIComponent(key);
    }
    if(type === 'hyphenated') {
      // Formatted text-key1:value1-key2:value2-key3:value3...
      var keySplit = key.split('-');
      return keySplit.length ? keySplit[0] : '';
    }
    if(type === 'image') {
      return key;
    }
    if(type === 'location') {
      // Return just the city rather than the complete formatted location key.
      return getLocationDataFromKey(key).city;
    }
    if(type === 'number') {
      return key;
    }
    if(type === 'username') {
      // Formatted <website> <username>
      var id = ('' + key).toLowerCase();
      return id.substring(id.indexOf(' ') + 1, id.length);
    }
    return ('' + key).toLowerCase();
  }

  /**
   * Returns the text for the facets data with the given key and type.
   */
  function getFacetsDataText(key, type) {
    if(type === 'id') {
      return key.substring(0, key.indexOf('-'));
    }
    if(type === 'date') {
      return getFormattedDate(key);
    }
    if(type === 'email') {
      return decodeURIComponent(key);
    }
    if(type === 'hyphenated') {
      return getTextFromHyphenatedKey(key);
    }
    if(type === 'image') {
      return key.substring(key.lastIndexOf('/') + 1);
    }
    if(type === 'location') {
      return getLocationDataFromKey(key).text;
    }
    if(type === 'number') {
      return key;
    }
    if(type === 'phone') {
      return getFormattedPhone(key);
    }
    return ('' + key).toLowerCase();
  }

  /**
   * Returns the ID for the extraction data with the given key, value, and type.
   */
  function getExtractionDataId(key, value, type) {
    if(type === 'id') {
      return value;
    }
    if(type === 'email') {
      return decodeURIComponent(key || value);
    }
    return key || value;
  }

  /**
   * Returns the text for the extraction data with the given key, value, type, and index.
   */
  function getExtractionDataText(key, value, type, index) {
    if(type === 'id') {
      return value;
    }
    if(type === 'date') {
      return getFormattedDate(value || key);
    }
    if(type === 'email') {
      return decodeURIComponent(value || key);
    }
    if(type === 'hyphenated') {
      return getTextFromHyphenatedKey(key) || value;
    }
    if(type === 'image') {
      return 'Image' + (index >= 0 ? (' #' + (index + 1)) : '');
    }
    if(type === 'city' || type === 'location') {
      return getLocationDataFromKey(key).text || value;
    }
    if(type === 'phone') {
      return getFormattedPhone(value || key);
    }
    return value || key;
  }

  /**
   * Returns whether the given extraction has the required properties (an ID).
   */
  function isGoodExtraction(object) {
    return object.id;
  }

  /**
   * Returns whether the given location data object has the required properties.
   */
  function isGoodLocation(location) {
    return location.id && location.latitude && location.longitude && location.text;
  }

  /**
   * Returns the filter function for the extraction data with the given type.
   */
  function getExtractionFilterFunction(type) {
    if(type === 'location') {
      return isGoodLocation;
    }
    return isGoodExtraction;
  }

  /**
  * Changes the key/value names of buckets given from an aggregation
  * to names preferred by the user.
  */
  return {
    /**
     * Returns the JS Date object for the given date string and the given date interval (hour/day/week/month/year).
     */
    getDateForInterval: function(dateString, interval) {
      return getDateForInterval(dateString, interval);
    },

    /**
     * Returns the hex color for the given color.
     */
    getHexColor: function(color) {
      return getHexColor(color);
    },

    /**
     * Returns the ID for the facets data with the given key and type.
     */
    getFacetsDataId: function(key, type) {
      return getFacetsDataId(key, type);
    },

    /**
     * Returns the text for the facets data with the given key and type.
     */
    getFacetsDataText: function(key, type) {
      return getFacetsDataText(key, type);
    },

    /**
     * Returns the ID for the extraction data with the given key, value, and type.
     */
    getExtractionDataId: function(key, value, type) {
      return getExtractionDataId(key, value, type);
    },

    /**
     * Returns the text for the extraction data with the given key, value, type, and index.
     */
    getExtractionDataText: function(key, value, type, index) {
      return getExtractionDataText(key, value, type, index);
    },

    /**
     * Returns the filter function for the extraction data with the given type.
     */
    getExtractionFilterFunction: function(type) {
      return getExtractionFilterFunction(type);
    },

    /**
     * Returns the formatted string for the given date number/string in UTC format.
     */
    getFormattedDate: function(dateString, interval) {
      return getFormattedDate(dateString, interval);
    },

    /**
     * Returns the formatted telephone number.
     */
    getFormattedPhone: function(phone) {
      return getFormattedPhone(phone);
    },

    /**
     * Returns the source URL for the image with the given ID using the given config.
     */
    getImageUrl: function(id, config) {
      return getImageUrl(id, config);
    },

    /**
     * Returns the link for the given ID.
     */
    getLink: function(itemId, linkType, fieldType, fieldId) {
      return getLink(itemId, linkType, fieldType, fieldId);
    },

    /**
     * Returns the link function for the field with the given settings.
     */
    getLinkFunction: function(linkType, fieldType, fieldId) {
      return getLinkFunction(linkType, fieldType, fieldId);
    },

    /**
     * Returns the location data from the given location key formatted as city:state:country:longitude:latitude.
     */
    getLocationDataFromKey: function(key) {
      return getLocationDataFromKey(key);
    },

    /**
     * Returns the style class for the given color.
     */
    getStyleClass: function(color) {
      return getStyleClass(color);
    },

    /**
     * Returns whether the given location data object has the required properties.
     */
    isGoodLocation: function(location) {
      return isGoodLocation(location);
    }
  };
});
