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

/* exported commonTransforms */
/* jshint camelcase:false */

var commonTransforms = (function(_, moment, domain) {
  /**
   * Returns the formatted string for the given date number/string in UTC format.
   */
  function getFormattedDate(date) {
    return date ? moment.utc(new Date(date)).format('MMM D, YYYY') : 'No Date';
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
   * Returns the link for the given key.
   */
  function getLink(key, link, type) {
    if(type === 'document') {
      return '/document.html?domain=' + domain + '&id=' + key;
    }
    if(key && link === 'entity') {
      if(type === 'email') {
        return '/entity.html?domain=' + domain + '&id=' + encodeURIComponent(key) + '&type=' + type;
      }
      return '/entity.html?domain=' + domain + '&id=' + key + '&type=' + type;
    }
    return undefined;
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
    var text = city ? (city + (state ? (', ' + state) : '')) : 'No Location';

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
    return color ? ('entity-' + color.replace(/ /g, '-')) : '';
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
      return undefined;
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
    if(type === 'email') {
      return decodeURIComponent(key);
    }
    if(type === 'hyphenated') {
      // Formatted text-key1:value1-key2:value2-key3:value3...
      var keySplit = key.split('-');
      return keySplit.length ? keySplit[0] : '';
    }
    if(type === 'location') {
      // Return just the city rather than the complete formatted location key.
      return getLocationDataFromKey(key).city;
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
    if(type === 'date') {
      return getFormattedDate(key);
    }
    if(type === 'email') {
      return decodeURIComponent(key);
    }
    if(type === 'hyphenated') {
      return getTextFromHyphenatedKey(key);
    }
    if(type === 'location') {
      return getLocationDataFromKey(key).text;
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
    if(type === 'email') {
      return decodeURIComponent(key || value);
    }
    return key || value;
  }

  /**
   * Returns the text for the extraction data with the given key, value, type, and index.
   */
  function getExtractionDataText(key, value, type, index) {
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
      return 'Image #' + (index + 1);
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
   * Returns whether the given location data object has the required properties.
   */
  function isGoodLocation(location) {
    return location.latitude && location.longitude && location.text;
  }

  /**
   * Returns the filter function for the extraction data with the given type.
   */
  function getExtractionFilterFunction(type) {
    if(type === 'location') {
      // TODO Filter out bad locations once the data can support it.
      //return isGoodLocation;
    }
    return function() {
      return true;
    };
  }

  /**
  * Changes the key/value names of buckets given from an aggregation
  * to names preferred by the user.
  */
  return {
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
    getFormattedDate: function(date) {
      return getFormattedDate(date);
    },

    /**
     * Returns the formatted telephone number.
     */
    getFormattedPhone: function(phone) {
      return getFormattedPhone(phone);
    },

    /**
     * Returns the link for the given key.
     */
    getLink: function(key, link, type) {
      return getLink(key, link, type);
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
