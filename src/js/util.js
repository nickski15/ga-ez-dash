// Copyright 2012 Google Inc. All Rights Reserved.

/* Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * This file provices utility methods used by the rest of the gadash library.
 */


/**
 * Namespace for util object. Contains lots of library utilities.
 */
gadash.util = gadash.util || {};


/**
 * Converts string representing a date with the format YYYYMMDD
 * @param {Object} dataTable - The Google DataTable object holding
 *     the response data.
 */
gadash.util.convertDateFormat = function(dataTable) {
  //Stores the first value of the first column of the response data
  var isStrDate = new String(dataTable.getValue(0, 0));

  //Checks if the string object is representing a date with the format YYYYMMDD
  var datePattern = /^(20)\d{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$/;
  if (isStrDate.search(datePattern) == 0) {
    dataTable = gadash.util.convertToMMMd(dataTable);
  }
};


/**
 * Takes the first column of the dataTable and changes its values to
 * a date string of the form 'MMM dd' (e.g., Oct 23).
 * @param {Object} dTable - The Google DataTable object holding
 *     the response data.
 * @return {Object} dTable - A Google DataTable object populated
 *     with the GA response data and modified string date format.
 */
gadash.util.convertToMMMd = function(dTable) {
  var numberOfRows = dTable.getNumberOfRows();
  for (var rowIndex = 0; rowIndex < numberOfRows; rowIndex++) {
    dTable.setValue(
        rowIndex, 0, gadash.util.stringDateToString(
            dTable.getValue(rowIndex, 0)
        )
    );
  }
  return dTable;
};


/**
 * Converts a String composed of 8 digits representing a date (e.g., 20121023)
 * into a String composed of 3 letters representing the month followed by a
 * space and 1 or 2 digits representing the day of the month (e.g., Oct 23).
 * @param {String} date - 8 digits in the following format: YYYYMMDD.
 * @return {String} date - in the format: MMM D.
 */
gadash.util.stringDateToString = function(date) {
  //Checks if the string object is representing a date with the format YYYYMMDD
  var datePattern = /^(20)\d{2}(0[1-9]|1[012])(0[1-9]|[12][0-9]|3[01])$/;
  if (date.search(datePattern) == 0) {
    var monthMap = {
      '01': 'Jan',
      '02': 'Feb',
      '03': 'Mar',
      '04': 'Apr',
      '05': 'May',
      '06': 'Jun',
      '07': 'Jul',
      '08': 'Aug',
      '09': 'Sep',
      '10': 'Oct',
      '11': 'Nov',
      '12': 'Dec'
    };

    //Convert 2 digits representing a month into a 3 letters string
    var month = date.substring(4, 6);
    var monthStr = monthMap[month];

    //Convert 2 digits represneting a day into 1 or 2 digits string
    var day = date.substring(6, 8);
    if (day < 10) {
      day = day.substring(1, 2);
    }

    //Concatenate the resulting month and day separated by a white space
    date = monthStr + ' ' + day;
  }
  return date;
};


/**
 * Binds a method to its object.
 * @param {Object} object The main object to bind to.
 * @param {Object} method The method to bind to the object.
 * @return {function} the function passed in boound to the object parameter.
 */
gadash.util.bindMethod = function(object, method) {
  return function() {
    return method.apply(object, arguments);
  };
};


/**
 * Utility method to return the lastNdays from today in the format yyyy-MM-dd.
 * @param {Number} n The number of days in the past from tpday that we should
 *     return a date. Value of 0 returns today.
 * @return {String} date - The adjusted date value represented as a String.
 */
gadash.util.lastNdays = function(n) {
  var today = new Date();
  var before = new Date();
  before.setDate(today.getDate() - n);

  var year = before.getFullYear();

  var month = before.getMonth() + 1;
  if (month < 10) {
    month = '0' + month;
  }

  var day = before.getDate();
  if (day < 10) {
    day = '0' + day;
  }

  return [year, month, day].join('-');
};


/**
 * Utility method to return the lastNweeks from today in the format yyyy-MM-dd.
 * @param {Number} n The number of weeks in the past from today that we should
 *     return a date. Value of 0 returns today.
 * @return {String} date - The adjusted date value represented as a String.
 */
gadash.util.lastNweeks = function(n) {
  var today = new Date();
  var before = new Date();
  n = n * 7;
  before.setDate(today.getDate() - n);

  var year = before.getFullYear();

  var month = before.getMonth() + 1;
  if (month < 10) {
    month = '0' + month;
  }

  var day = before.getDate();
  if (day < 10) {
    day = '0' + day;
  }

  return [year, month, day].join('-');
};

/**
 * Utility method to return the lastNmonths from today in the format yyyy-MM-dd.
 * @param {Number} n The number of months in the past from today that we should
 *     return a date. Value of 0 returns today.
 * @return {String} date - The adjusted date value represented as a String.
 */

gadash.util.lastNmonths = function(n) {
  var date = new Date();

  if (n <= 0)
    return [date.getFullYear(), date.getMonth() + 1 , date.getDate()].join('-');
  var years = Math.floor(n / 12);
  var months = n % 12;

  if (years > 0)
    date.setFullYear(date.getFullYear() - years);

  if (months > 0) {
    if (months >= date.getMonth()) {
      date.setFullYear(date.getFullYear() - 1);
      months = 12 - months;
      date.setMonth(date.getMonth() + months);
    }
    else {
      date.setMonth(date.getMonth() - months);
    }


  }
  var day = date.getDate();
  day = day < 10 ? '0' + day : day;

  var month = date.getMonth() + 1;
  month = month < 10 ? '0' + month : month;

  return [date.getFullYear(), month, day].join('-');
};


/**
 * Utility method to return Date from a String in the format yyyy-MM-dd.
 * This function is used for a Chart that has a Time Series.
 * @param {String} date - The String representation of the date.
 * @return {Date} date - Corresponding JS Date object.
 */
gadash.util.stringToDate = function(date) {
  var year = date.substring(0, 4);
  var month = date.substring(4, 6);
  var day = date.substring(6, 8);

  if (month < 10) {
    month = month.substring(1, 2);
  }

  month = month - 1;

  if (day < 10) {
    day = day.substring(1, 2);
  }

  var dateObj = new Date(year, month, day);
  return dateObj;
};


/**
 * Formats the Google Metrics and Dimensions into readable strings
 * Strips away the 'ga' and capitalizes first letter. Also puts a space
 * between any lowercase and capital letters.
 * ie: "ga:percentNewVisits" ---> "Percent New Visits"
 * @param {String} gaString - the String name of Metric/Dimension from GA.
 * @return {String} newString - Metric/Dimension formatted nicely.
 */
gadash.util.formatGAString = function(gaString) {
  var newString = gaString.substring(3);
  newString = newString.charAt(0).toUpperCase() + newString.slice(1);

  // Check for a capital letter in the string. If found,
  // put a space between that char and the char before it.
  for (var i = 1; i < newString.length; i++) {
    if (newString.charAt(i) == newString.charAt(i).toUpperCase()) {
      var left = newString.substring(0, i);
      var right = newString.substring(i, newString.length);
      newString = [left, right].join(' ');
      i++;
    }
  }

  return newString;
};


/**
 * Recursively copies the values in the from object into the to object.
 * If a key in from object already exists, and has child values,
 * the child values are copied over. So:
 *     extend({'a': {'b': 2}}, {'a': {'c': 1}}) will result in:
 *     {'a': {'b': 2, 'c': 1}}
 * Once run, modifying the from object will not impact the to object.
 * Only keys with non-null or undefined values will be copied.
 * NOTE: Arrays will write over each other.
 * NOTE: This is unsafe in that circular references are not checked. Calling
 * this method with a circular reference could cause an infinite loop.
 * @param {Object} from The object to copy values from.
 * @param {Object} to The object to copy values into.
 */
gadash.util.extend = function(from, to) {
  for (var key in from) {
    if (from[key] !== null && from[key] !== undefined) {
      var type = gadash.util.getType(from[key]);
      if (type == 'object') {
        to[key] = to[key] || {};
        gadash.util.extend(from[key], to[key]);
      } else {
        to[key] = from[key];
      }
    }
  }
};


/**
 * Returns the native type (class property) of this object.
 * General idea grabbed from here: http://perfectionkills.com/
 *     instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
 * Per ECMA-262:
 *
 *     15.2.4.2 Object.prototype.toString ( )
 *     When the toString method is called, the following steps are taken:
 *     1. Get the [[Class]] property of this object.
 *     2. Compute a string value by concatenating the three
 *        strings "[object ", | Result(1), and "]".
 *     3. Return Result(2).
 *
 * @param {Object} value Any type.
 * @return {String} The lower class property of the object. Undefined if value
 *     is undefined or null.
 */
gadash.util.getType = function(value) {
  var classStringName = Object.prototype.toString.call(value);
  return ({
    '[object Boolean]': 'boolean',
    '[object Number]': 'number',
    '[object String]': 'string',
    '[object Array]': 'array',
    '[object Date]': 'date',
    '[object RegExp]': 'regex',
    '[object Function]': 'function',
    '[object Object]' : 'object'
  })[classStringName];
};


/**
 * HTML escapes the input string by converting the &, <, > and " characters
 * to their HTML escaped version. Taken from the code in the closure string
 * library.
 * @param {String} str The string to convert.
 * @return {String} The escaped string.
 */
gadash.util.htmlEscape = function(str) {
  var allRe = /[&<>\"]/;
  if (!allRe.test(str)) {
    return str;
  }

  if (str.indexOf('&') != -1) {
    str = str.replace(/&/g, '&amp;');
  }
  if (str.indexOf('<') != -1) {
    str = str.replace(/</g, '&lt;');
  }
  if (str.indexOf('>') != -1) {
    str = str.replace(/>/g, '&gt;');
  }
  if (str.indexOf('"') != -1) {
    str = str.replace(/"/g, '&quot;');
  }
  return str;
};


/**
 * Asynchronously loads a single JavaScript resource. If defined,
 * opt_callback is executed once the resource is done loading.
 * @param {String} url The JavaScript resource to load.
 * @param {String=} opt_callback Optional JavaScript function to execute once
 *     the JavaScript resource has loaded.
 */
gadash.util.loadJs_Resource = function(url, opt_callback) {
  var js = document.createElement('script');
  js.async = true;
  js.src = url;
  if (opt_callback) {
    js.onload = opt_callback;
  }
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(js, s);
};


/**
 * Variable to store a global callback. Used when loading Javascript
 * resources that support defining their own callback in the URL.
 * Should be used in conjunction with gadash.util.loadJs_ function..
 */
window.__globalCallback = {};


/**
 * Loads multiple JavaScript resources and executes finalCallback
 * once all are done loading. Some resources require a callback
 * function to be defined in the URL. These resources can be loaded
 * by setting opt_useGlobal to true, then using the global variable
 * __globalCallback as the name of the callback function in the URI.
 * @param {Array.<String>} urls An array of URLs of JavaScript resources
 *     to load.
 * @param {Function} finalCallback The function to execute once all the
 *     JavaScript resources have loaded.
 * @param {Boolean=} opt_useGlobal If all the callbacks should use a
 *     single global function. This is useful if the JavaScript resources
 *     require defining the callback in the URL itself.
 * @private.
 */
gadash.util.loadJs_ = function(urls, finalCallback, opt_useGlobal) {
  var callback = gadash.getIncrementalCallback(urls.length, finalCallback);
  if (opt_useGlobal) {
    window.__globalCallback = callback;
  }
  for (var i = 0, url; url = urls[i]; ++i) {
    if (opt_useGlobal) {
      gadash.util.loadJs_Resource(url);
    } else {
      gadash.util.loadJs_Resource(url, callback);
    }
  }
};


/**
 * Returns a function that can be executed numberOfCallbacks times before
 * finalCallback is executed.
 * @param {Number} numberOfCallbacks The number of times this function
 *     should execute. Incremented for each execution.
 * @param {Function} finalCallback The function to execute once
 *     once numberOfCallbacks execution times have been reached.
 * @return {Function} A function that can be excuted numberOfCallbacks
 *     times before finalCallback is executed.
 */
gadash.getIncrementalCallback = function(numberOfCallbacks, finalCallback) {
  var callbackCount = 0;

  return function() {
    ++callbackCount;
    if (callbackCount >= numberOfCallbacks) {
      finalCallback();
    }
  };
};


/**
 * Returns an element either by ID or reference.
 * @param {object|String} elementId Either the reference to the element or
 *     if it's a string, it's ID.
 * @return {object} The referenced element.
 */
gadash.util.getElement = function(elementId) {
  if (gadash.util.getType(elementId) == 'string') {
    return document.getElementById(elementId);
  }
  return elementId;
};


/**
 * Returns an data uri of an ajax preloader image.
 * @return {String}  data URI to be used in an image tag.
 */
gadash.util.getLoaderUri = function() {
  return [
    'data:image/gif;base64,R0lGODlhIAAgAPYAAP///3d3d/v7++/v7+bm5ufn5/X19f',
    'z8/Pn5+djY2LCwsJubm6CgoL+/v+jo6Pj4+ODg4J+fn3l5eYaGhu7u7vPz88rKys/Pz/',
    'f398DAwISEhJOTk9nZ2ezs7Orq6re3t5aWloyMjI6OjtDQ0LW1tX5+fomJidHR0aSkpP',
    'T09L6+voiIiH19fdLS0oWFheHh4YKCgnx8fIuLi729vd7e3peXl4CAgLS0tMTExMPDw4',
    'ODg8HBwdfX15CQkNra2sXFxZqamunp6c7Ozt3d3eLi4uPj46ampoqKisLCwrm5ubOzs7',
    'u7u3t7e9vb29PT07i4uMbGxq6urq+vr9bW1uvr66qqqtXV1dTU1La2tuTk5Ly8vKWlpZ',
    'GRkd/f3/Dw8Pr6+vb29vHx8Y2Njaurq6ioqPLy8rKysgAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'AAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW',
    '5mbwAh+QQJCgAAACwAAAAAIAAgAAAH/4AAgoOEhYaHiImKi4yNjQeGCCkCjoYpBDQFKY',
    'MCHDMElYQeKgw1DA1BkAg5QAmhghUfKxK0Jh8VBwcOPBWFFR0PiQIJILTGGwmQALmEKU',
    'tGTgiIDxYhxrUW0ocEGyUKBogIFyLXEiEnlIcVz9GIBwQMLNcMRMrqHsGJBiMLGjYuC4',
    'RgeFXoAAYPLVSQ2OEDHMFBCCBkIJGBwwAD6Rwx45QggoYSAF+8cmDBAoVBAxSUu5GvUY',
    'UnE0zscEhgQbkFvRxRMEJLQc4CDMoxyNkIA5QaC0YMBGCgwQRjLnBkbGSACBGHyxwo2G',
    'BiA4mTDwtS4HAigQOMYQ89eGEhBy97iZg2uoOAQsYEED82xSVigcZSdSRgGAMyJC6HGi',
    '42ZEPUAUUMYyFGKEOAQRtTEiVoRaGCqIKCzLRA+AAgoAiSJCdyYlABg0kJKUQLdtSgo8',
    'eMAbqMwCjRwwK4d0ZqGJkytdCDBDM+WOhwQJwMY0Y8CDrgoUkBy4gEVKiQD4GQI7RKRC',
    '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',
    'A7AAAAAAAAAAAA'].join('');
};


/**
 * Namespace for pubsub module.
 * Usage:
 * gadash.util.pubsub.subscribe - used to subscribe a function to be executed
 * gadash.util.pubsub.publish - used to broadcast an event and execute all
 *     subscribed functions.
 */
gadash.util.pubsub = gadash.util.pubsub || {};


/**
 * Message for when the all the main libraries have loaded.
 * @type {String}
 */
gadash.util.pubsub.libsLoaded = 'LIBS_LOADED';


/**
 * Used to store the relationship between messages and subscribed functions.
 * @type {Object}
 */
gadash.util.pubsub.map = {};


/**
 * Subscribes a function to a particular message.
 * @param {String} message The message to which the function func is
 *     subscribed.
 * @param {function} func The function to subscribe to a particular message.
 */
gadash.util.pubsub.subscribe = function(message, func) {
  if (!gadash.util.pubsub.map[message]) {
    gadash.util.pubsub.map[message] = [];
  }
  gadash.util.pubsub.map[message].push(func);
};


/**
 * Publishes message. All subscribed functions are executed.
 * @param {String} message The message to publish.
 */
gadash.util.pubsub.publish = function(message) {
  if (gadash.util.pubsub.map[message] &&
      gadash.util.pubsub.map[message].length) {
    for (var i = 0, func; func = gadash.util.pubsub.map[message][i]; ++i) {
      func();
    }
  }
};


/**
 * TODO: Should be namespaced by user ID.
 * Stores data in localstorage if avaliable.
 * @param {string} key The key of the data to store.
 * @param {Object} data The data to store.
 */
gadash.util.save = function(key, data) {
  if (localStorage && JSON) {
    localStorage.setItem(key, JSON.stringify(data));
  }
};


/**
 * Loads data from localstorage if avaliable.
 * @param {string} key The key of the data to store.
 * @return {Object} The data stored under the key.
 */
gadash.util.load = function(key) {
  if (localStorage && JSON) {
    return JSON.parse(localStorage.getItem(key));
  }
};


/**
 * Displays an error message to the user in a div with the ID of
 * "errors". If this div doesn't exist, it is created and appeneded to.
 * The message is html escaped by default.
 * @param {String} message The error message to display.
 */
gadash.util.displayError = function(message) {
  var errorDiv = document.getElementById('errors');

  // Create error div if not already made.
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.setAttribute('id', 'errors');
    errorDiv.innerHTML = 'ERRORS:' + '<br>';
    document.body.appendChild(errorDiv);
  }

  errorDiv.innerHTML += gadash.util.htmlEscape(message) + '<br>';
};
