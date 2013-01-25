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
 * NOTE: Arrays will write over each other.
 * NOTE: This is unsafe in that circular references are not checked. Calling
 * this method with a circular reference could cause an infinite loop.
 * @param {Object} from The object to copy values from.
 * @param {Object} to The object to copy values into.
 */
gadash.util.extend = function(from, to) {
  for (var key in from) {
    var type = gadash.util.getType(from[key]);
    if (type == 'object') {
      to[key] = to[key] || {};
      gadash.util.extend(from[key], to[key]);
    } else {
      to[key] = from[key];
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

