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
 *
 * @fileoverview
 * Provides wrappers to authorize users with the Google Analytics API.
 * This also provides the initialization object for users to specify
 * their API keys.
 * Once a user has authorized, and all the libaries are loaded,
 * all functions on the comandQueue array are executed and the isLoaded
 * variable is set to true.
 */


/**
 * Namespace for this library if not already created.
 */
var gadash = gadash || {};


/**
 * Namespace for the auth module.
 */
gadash.auth = gadash.auth || {};


/**
 * Stores all the initalization library default configurations.
 */
gadash.auth.config = {
  onAuthorized: function() {},
  onUnAuthorized: function() {}
};


/**
 * Stoes user information returned from the OAuth User API.
 */
gadash.userInfo = {};


/**
 * Boolean that checks to see if gapi client is loaded.
 */
gadash.isLoaded = false;


/**
 * An array for all the oauth2 scopes to authorize the user for.
 * @const {Array}
 * @private
 */
gadash.auth.SCOPES_ = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email'];


/**
 * List of functions that are queued for execution. This is only used
 * until all the libraries have fully loaded.
 * @type {Array}
 * @private
 */
gadash.commandQueue_ = [];


/**
 * Initializes the ga-ez-dash library. This must be called before any of the
 * library is used. Both the apiKey and clientId properties are required.
 * Optionally you can override the default behavor when a user either
 * has authorized access or when they un authorized access.
 *
 * Usage:
 * daash.init({
 *   apiKey: 'API Key found in Google APIs Console',     // required.
 *   clientId: 'Client ID found in Google APIs Console'  // required.
 *   onUnAuthorized: function() {},
 *   onAuthorized: function() {}
 * })
 * @param {Object} authConfig Contains initalization settings.
 */
gadash.init = function(authConfig) {
  gadash.util.extend(authConfig, gadash.auth.config);

  /* Set default auth handlers if not overridden.
  if (authConfig.onUnAuthorized) {
    gadash.auth.config.onUnAuthorized = gadash.auth.onUnAuthorizedDefault;
  }

  if (!authConfig.onAuthorized) {
    gadash.auth.config.onAuthorized = gadash.auth.onAuthorizedDefault;
  }*/

  /*
   * Dynamically loads the Google Visualization, and Google JavaScript API
   * Client library. Once both are done loading, the
   * window.gadashInit_ method is executed.
   */
  gadash.util.loadJs_([
    'https://www.google.com/jsapi?autoload=' + encodeURIComponent(
        '{"modules":[{"name":"visualization","version":"1",' +
        '"callback":"__globalCallback","packages":["corechart","table"]}]}'),
    'https://apis.google.com/js/client.js?onload=__globalCallback'
  ], window.gadashInit_, true);
};


/**
 * Updates the UI if a user has not yet authorized this script to access
 * their Google Analytics data. This function changes the visibility of
 * some elements on the screen. It also adds the handleAuthClick
 * click handler to the authorize-button.
 */
gadash.auth.onUnAuthorizedDefault = function() {
  document.getElementById('gadash-auth').innerHTML =
      '<button id="authorize-button">Authorize Analytics</button>';
  document.getElementById('authorize-button').onclick = gadash.auth.authorize;
};


/**
 * Updates the UI once the user has authorized this script to access their
 * data by hiding the authorize button. Also, runs executeCommandQueue
 * function to render all CoreQuerys in the commandQueue. The execution of the
 * command queue only happens once.
 */
gadash.auth.onAuthorizedDefault = function() {
  var status = 'You are authorized';
  if (gadash.userInfo.email) {
    status += ' as ' + gadash.userInfo.email;
  }

  document.getElementById('gadash-auth').innerHTML =
      status + ' <button id="authorize-button">Logout</button>';

  document.getElementById('authorize-button').onclick =
      gadash.auth.accountLogout;
};


/**
 * Logs a user out of all their Google Accounts.
 */
gadash.auth.accountLogout = function() {
  window.document.location = 'https://accounts.google.com/logout';
};


/**
 * Callback executed once the Google APIs Javascript client library has loaded.
 * The function name is specified in the onload query parameter of URL to load
 * this library. After 1 millisecond, checkAuth is called.
 * @private
 */
window.gadashInit_ = function() {
  gapi.client.setApiKey(gadash.auth.config.apiKey);
  window.setTimeout(gadash.auth.checkAuth_, 1);
};


/**
 * Uses the OAuth2.0 clientId to query the Google Accounts service
 * to see if the user has authorized. Once complete, handleAuthResults is
 * called.
 * @private
 */
gadash.auth.checkAuth_ = function() {
  gapi.auth.authorize({
    client_id: gadash.auth.config.clientId,
    scope: gadash.auth.SCOPES_,
    immediate: true}, gadash.auth.handleAuthResult_);
};


/**
 * Handler that is called once the script has checked to see if the user has
 * authorized access to their Google Analytics data. If the user has authorized
 * access, the analytics api library is loaded and the loadUserName
 * function is executed. If the user has not authorized access to their data,
 * the user overridable onUnAuthorized function is executed. If the function
 * does not return false, then onUnAuthorizedDefault is executed.
 * @param {Object} authResult The result object returned form the authorization
 *     service that determine whether the user has currently authorized access
 *     to their data. If it exists, the user has authorized access.
 * @private
 */
gadash.auth.handleAuthResult_ = function(authResult) {
  if (authResult) {
    gapi.client.setApiVersions({'analytics': 'v3'});
    gapi.client.load('analytics', 'v3', gadash.auth.loadUserName_);
  } else {

    if (gadash.auth.config.onUnAuthorized() !== false) {
      gadash.auth.onUnAuthorizedDefault();
    }
  }
};


/**
 * Loads user information including the email address of the currently logged
 * in user from the OAuth API. Once loaded, the response is stored and
 * onAuthorizedDefault is called.
 * @private
 */
gadash.auth.loadUserName_ = function() {
  gapi.client.request({
    'path': '/oauth2/v2/userinfo'
  }).execute(gadash.auth.loadUserNameHander_);
};


/**
 * Handles the results for the user info API. The results from the
 * gadash.userInfo. The user overrideable onAuthorized handler is
 * executed. If it does not return false, then the default handler
 * is executed to update the UI.
 * Once complete, the library is ready to make requests to the API.
 * isLoaded is set to true and all the functions on the command queue
 * are exucuted.
 * @param {Object} response The response returned from the user info API.
 * @private
 */
gadash.auth.loadUserNameHander_ = function(response) {
  gadash.userInfo = response;

  // Escape this just to be sure.
  if (gadash.userInfo.email) {
    gadash.userInfo.email = gadash.util.htmlEscape(gadash.userInfo.email);
  }

  if (gadash.auth.config.onAuthorized() !== false) {
    gadash.auth.onAuthorizedDefault();
  }

  gadash.isLoaded = true;
  gadash.auth.executeCommandQueue_();
};


/**
 * Checks to see if user is authenticated, calls handleAuthResult
 * @return {boolean} false.
 */
gadash.auth.authorize = function() {
  gapi.auth.authorize({
    client_id: gadash.auth.config.clientId,
    scope: gadash.auth.SCOPES_,
    immediate: false}, gadash.auth.handleAuthResult_);
  return false;
};


/**
 * Iterates through all commands on the commandQueue and executes them.
 * @private
 */
gadash.auth.executeCommandQueue_ = function() {
  for (var i = 0, command; command = gadash.commandQueue_[i]; ++i) {
    command();
  }
};
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
 * @author shan.aminzadeh@gmail.com (Shan Aminzadeh)
 * @author aryabond@gmail.com (Arya Bondarian)
 * @author agau@uci.edu (Albert Gau)
 * @author travisrlai@gmail.com (Travis Lai)
 * @author danielnuwin@gmail.com (Daniel Nguyen)
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * Provides the CoreQuery object that simplifies querying the
 * Google Analytics Core Reporting API.
 */



/**
* A Core Query object is the base object to perform a Core Reporting API query.
* It accepts an optional configuration object that contains an
* object defining the query. Also changes start and end date of
* the query, if last-n-days is set in the config.
* Usage:
* var cq = new gadash.CoreQuery({
*   query: {
*     'ids': 'ga:xxxx', # Table ID where xxxx is the profile ID.
*     'start-date': '2012-01-01',
*     'end-date': '2012-02-01',
*     'metrics': 'ga:visits'
*   },
*   onSuccess: function(response) {
*     // Handle API response.
*   }
* });
*
* @param {Object=} opt_config Contains all configuration variables
*     of a Chart object. This parameter is passed by value, and a deep
*     copy is made. Once set, the original object can be modified and
*     it will not affect this object.
* @return {Object} this Returns a reference to the newly instantiated
*     Chart instance. Useful for chaining methods together.
* @constructor
*/
gadash.CoreQuery = function(opt_config) {
  this.config = {};
  this.set(opt_config);
  return this;
};


/**
 * Extends the values in the CoreQuery's config object with the keys in
 * the config parameters. If a key in config already exists in the CoreQuery,
 * and the value is not an object, the new value overwrites the old.
 * @param {Object} config The config object to set inside this object.
 * @return {Object} The current instance of the Chart object. Useful
 *     for chaining methods.
 */
gadash.CoreQuery.prototype.set = function(config) {
  gadash.util.extend(config, this.config);
  return this;
};


/**
 * First checks to see if the GA library is loaded. If it is then the
 * CoreQuery can be rendered right away. Otherwise, other operations are queued,
 * so the render command is pushed to the command queue to be executed in
 * the same order as originally called.
 * @this Points to the current CoreQuery instance.
 * @return {Object} The current instance of this CoreQuery object. Useful for
 *     chaining methods.
 */
gadash.CoreQuery.prototype.render = function() {

  // If the client library has loaded.
  if (gadash.isLoaded) {
    this.renderFunction();
  } else {
    var renderFunction = gadash.util.bindMethod(this, this.renderFunction);
    gadash.commandQueue.push(renderFunction);
  }

  return this;
};


/**
 * Makes a request to the Google Analytics API.
 * Updates the default dates.
 * Next, the function also creates and executes a Google Analytics
 * API request using the Chart objects callback method. The callback
 * is bound to the Chart instance so a reference back to this query is
 * maintained within the callback.
 */
gadash.CoreQuery.prototype.renderFunction = function() {
  this.setDefaultDates(this.config);
  var request = gapi.client.analytics.data.ga.get(this.config.query);
  request.execute(gadash.util.bindMethod(this, this.callback));
};


/**
 * Handles setting default and last-n-days dates.
 * If last-n-days has been set, Updates the start and end date.
 * If neither start not end date is set, a default of the last
 * 28 days is used.
 * @param {Object} config A config object.
 */
gadash.CoreQuery.prototype.setDefaultDates = function(config) {
  if (config['last-n-days']) {
    config.query['end-date'] = gadash.util.lastNdays(0);
    config.query['start-date'] =
        gadash.util.lastNdays(this.config['last-n-days']);
  } else {
    if (!config.query['start-date'] || !config.query['end-date']) {
      // Provide a default date range of last 28 days.
      config.query['end-date'] = gadash.util.lastNdays(0);
      config.query['start-date'] = gadash.util.lastNdays(28);
    }
  }
};


/**
 * Callback function that is called after a GA query is executed.
 * First, the function checks to see if there are any errors on the
 * response. Then check to see if a onSuccess function was declared
 * in the config. If present, call onSuccess by first binding it to
 * this (ie this CoreQuery object instance). If not defined, just use
 * the default callback. The entire JSON response from the API
 * is passed to either defined or default callback.
 * @param {Object} response - Google Analytics API JSON response.
 */
gadash.CoreQuery.prototype.callback = function(response) {
  if (response.error) {
    this.defaultOnError(response.error.code + ' ' + response.error.message);
  } else {

    if (this.config.onSuccess) {
      gadash.util.bindMethod(this, this.config.onSuccess)(response);
    } else {
      this.defaultOnSuccess(response);
    }
  }
};


/**
 * Checks to see if onError parameter is set in config. If it is,
 * use the user defined error function else check to see if an error
 * div is created. If not, create an error div. Print error message
 * to the error div.
 * @param {String} message - error message to print.
 */
gadash.CoreQuery.prototype.defaultOnError = function(message) {

  // If onError param exists, use that as error handling function.
  if (this.config.onError) {
    this.config.onError(message);
  } else {

    var errorDiv = document.getElementById('errors');

    // Create error div if not already made.
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.style.color = 'red';
      errorDiv.setAttribute('id', 'errors');
      errorDiv.innerHTML = 'ERRORS:' + '<br />';
      document.body.appendChild(errorDiv);
    }

    // TODO(nm): Need better error handling.
    // Prints CoreQuery divContainer and message to error div.
    errorDiv.innerHTML += ' error: ' + message + '<br />';
    //errorDiv.innerHTML += this.config.divContainer + ' error: ' +
    //    message + '<br />';
  }
};


/**
 * Default callback for creating Google Charts with a response.
 * This is a no-op and should be overridden by a developer.
 * @param {Object} response A Google Analytics API JSON response.
 */
gadash.CoreQuery.prototype.defaultOnSuccess = function(response) {};
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
 * @author shan.aminzadeh@gmail.com (Shan Aminzadeh)
 * @author aryabond@gmail.com (Arya Bondarian)
 * @author agau@uci.edu (Albert Gau)
 * @author travisrlai@gmail.com (Travis Lai)
 * @author danielnuwin@gmail.com (Daniel Nguyen)
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * This file provides logic to transform the data returned from the
 * Core Reporting API into Google Visualization Charts.
 */


/**
 * Namespace for gviz object. Contains objects on the way charts are
 * displayed.
 */
gadash.gviz = gadash.gviz || {};



/**
 * Base Chart for the Core Reporting API.
 * @param {opt_config=} opt_config An optional configuration object.
 *     See docs for usage.
 * @return {Object} The newly created chart object useful for chaining.
 * @constructor.
 */
gadash.Chart = function(opt_config) {
  this.config = {};
  this.set(opt_config);
  return this;
};


/**
 * Subclass CoreQuery by chaining the Chart prototype to the Core Query.
 */
gadash.Chart.prototype = new gadash.CoreQuery();


/**
 * Default callback for creating Google Charts with a response. First, the
 * response is put into a DataTable object Second, the corresponding chart
 * is returned. The two are then combined to draw a query that is populated
 * with the GA data.
 * @param {Object} response A Google Analytics API JSON response.
 */
gadash.Chart.prototype.defaultOnSuccess = function(response) {
  var dataTable = gadash.gviz.getDataTable(response, this.config.type);
  var chart = gadash.gviz.getChart(this.config.divContainer, this.config.type);
  gadash.gviz.draw(chart, dataTable, this.config.chartOptions);
};


/**
 * Creates a DataTable object using a GA response.
 * @param {Object} resp A Google Analytics response.
 * @param {String=} opt_chartType The chart type. Provides a hint on
 *     how to parse the API results into a data table.
 * @return {Object} data A Google DataTable object populated
 *     with the GA response data.
 * @this references the Chart object.
 */
gadash.gviz.getDataTable = function(resp, opt_chartType) {

  var chartType = opt_chartType || false;

  var data = new google.visualization.DataTable();
  var numOfColumns = resp.columnHeaders.length;
  var numOfRows;

  // Throw an error if there are no rows returned.
  if (resp.rows && resp.rows.length) {
    numOfRows = resp.rows.length;
  } else {
    this.defaultOnError('No rows returned for that query.');
  }

  /*
   * Looks at the resp column headers to set names and types for each column.
   * Since bar and column chart don't support date object, set type as string
   * rather than a Date.
   */
  for (var i = 0; i < numOfColumns; i++) {
    var dataType = resp.columnHeaders[i].dataType;
    var name = resp.columnHeaders[i].name;

    if (name == 'ga:date' &&
        !(chartType == 'ColumnChart' || chartType == 'BarChart')) {

      dataType = 'date';
    } else if (dataType == 'STRING') {
      dataType = 'string';
    } else {
      dataType = 'number';
    }
    data.addColumn(dataType, gadash.util.formatGAString(name));
  }

  /*
   * Populates the rows by using the resp.rows array. If the type
   * is an int then parse the INT. If it is a percent, then round
   * to last two decimal places and store as INT.
   */
  for (var i = 0; i < numOfRows; i++) {
    var arrayMetrics = [];
    for (var j = 0; j < numOfColumns; j++) {
      var name = resp.columnHeaders[j].name;
      var dataType = resp.columnHeaders[j].dataType;

      if (name == 'ga:date' &&
          !(chartType == 'ColumnChart' || chartType == 'BarChart')) {

        arrayMetrics.push(gadash.util.stringToDate(resp.rows[i][j]));
      } else if (dataType == 'INTEGER') {
        arrayMetrics.push(parseInt(resp.rows[i][j]));
      } else if (dataType == 'CURRENCY') {
        arrayMetrics.push(parseFloat(resp.rows[i][j]));
      } else if (dataType == 'PERCENT' || dataType == 'TIME' ||
          dataType == 'FLOAT') {
        arrayMetrics.push(Math.round((resp.rows[i][j]) * 100) / 100);
      } else {
        arrayMetrics.push(resp.rows[i][j]);
      }
    }
    data.addRow(arrayMetrics);
  }

  /*
   * Iterates through each column in the data table and formats
   * any column that has a CURRENCY datatype to two decimal places
   * and a '$' before the amount.
   */
  for (var i = 0; i < numOfColumns; i++) {
    var dataType = resp.columnHeaders[i].dataType;
    if (dataType == 'CURRENCY') {
      var formatter = new google.visualization.NumberFormat(
          {fractionDigits: 2});
      formatter.format(data, i);
    }
  }

  return data;
};


/**
 * Checks to see if the type of chart in the config is valid.
 * If it is, get its chart instance, else return a Table instance.
 * @param {String} id The ID of the HTML element in which to render
 *     the chart.
 * @param {String} chartType The type of the Chart to render.
 * @return {Object} visualization - returns the Chart instance.
 */
gadash.gviz.getChart = function(id, chartType) {
  var elem = document.getElementById(id);

  if (google.visualization[chartType]) {
    return new google.visualization[chartType](elem);
  }

  return new google.visualization.Table(elem);
};


/**
 * Draws a chart to its declared div using a DataTable.
 * @param {Object} chart - The Chart instance you wish to draw the data into.
 * @param {Object} dataTable - The Google DataTable object holding
 *     the response data.
 * @param {Object} chartOptions - The optional configuration parameters to pass
 *     into the chart.
 */
gadash.gviz.draw = function(chart, dataTable, chartOptions) {

  // TODO(nm): Re-evaluate why we do this here.
  gadash.util.convertDateFormat(dataTable);
  gadash.gviz.createDateFormater(dataTable);
  chart.draw(dataTable, chartOptions);
};


/**
 * Creates a date format 'MMM d', which can be called by chart wrappers
 * @param {Object} dataTable - The Google DataTable object holding
 *     the response data.
 */
gadash.gviz.createDateFormater = function(dataTable) {
  var dateFormatter = new google.visualization.DateFormat({pattern: 'MMM d'});
  dateFormatter.format(dataTable, 0);
};



/**
 * Line Chart Wrapper
 * gadash.GaLineChart is a subclass of gadash.Chart.
 * GaLineChart declares a configuration object as its super class Chart and
 * attributes default setting specific to line charts.
 * A optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {Object=} opt_config - Contains all configuration variables
 *     of a Chart object. This parameter is passed by value, and a deep
 *     copy is made. Once set, the original object can be modified and
 *     it will not affect this object.
 * @return {Object} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 * @constructor
 */
gadash.GaLineChart = function(div, ids, metrics, opt_config) {
  this.config = {};
  this.set({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .set(gadash.gviz.defaultChartOptions)
  .set(gadash.gviz.lineChart)
  .set(opt_config);
  return this;
};


/**
 * Make GaLineChart a subclass of Chart class using chaining inheritance.
 */
gadash.GaLineChart.prototype = new gadash.Chart();



/**
 * Area Chart Wrapper
 * gadash.GaAreaChart is a subclass of gadash.Chart
 * GaAreaChart declares a configuration object as its super class Chart and
 * attributes default setting specific to line charts.
 * A optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30 if opt_config does
 *         not specify the entries.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {Object=} opt_config - Contains all configuration variables
 *     of a Chart object. This parameter is passed by value, and a deep
 *     copy is made. Once set, the original object can be modified and
 *     it will not affect this object.
 * @return {Object} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 * @constructor
 */
gadash.GaAreaChart = function(div, ids, metrics, opt_config) {
  this.config = {};
  this.set({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .set(gadash.gviz.defaultChartOptions)
  .set(gadash.gviz.areaChart)
  .set(opt_config);
  return this;
};


/**
 * Make GaAreaChart a subclass of Chart class using chaining inheritance.
 */
gadash.GaAreaChart.prototype = new gadash.Chart();



/**
 * Pie Chart Wrapper
 * gadash.GaPieChart is a subclass of gadash.Chart
 * GaPieChart declares a configuration object as its super class Chart and
 * attributes default setting specific to pie charts.
 * A optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {String} dimensions - contains the dimensions to be used in chart.
 * @param {Object=} opt_config - Contains all configuration variables
 *     of a Chart object. This parameter is passed by value, and a deep
 *     copy is made. Once set, the original object can be modified and
 *     it will not affect this object.
 * @return {Object} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 * @constructor
 */
gadash.GaPieChart = function(div, ids, metrics, dimensions, opt_config) {
  this.config = {};
  this.set({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': dimensions
    }
  })
  .set(gadash.gviz.defaultChartOptions)
  .set(gadash.gviz.pieChart)
  .set(opt_config);
  return this;
};


/**
 * Make GaPieChart a subclass of Chart class using chaining inheritance.
 */
gadash.GaPieChart.prototype = new gadash.Chart();



/**
 * Bar Chart Wrapper
 * gadash.GaBarChart is a subclass of gadash.Chart.
 * GaBarChart declares a configuration object as its super class Chart and
 * attributes default setting specific to line charts.
 * A optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {Object=} opt_config - Contains all configuration variables
 *     of a Chart object. This parameter is passed by value, and a deep
 *     copy is made. Once set, the original object can be modified and
 *     it will not affect this object.
 * @return {Object} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 * @constructor
 */
gadash.GaBarChart = function(div, ids, metrics, opt_config) {
  this.config = {};
  this.set({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .set(gadash.gviz.defaultChartOptions)
  .set(gadash.gviz.barChart)
  .set(opt_config);
  return this;
};


/**
 * Make GaBarChart a subclass of Chart class using chaining inheritance.
 */
gadash.GaBarChart.prototype = new gadash.Chart();



/**
 * Bar Column Wrapper
 * gadash.GaColumnChart is a subclass of gadash.Chart.
 * GaColumnChart declares a configuration object as its super class Chart and
 * attributes default setting specific to line charts.
 * A optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {Object=} opt_config - Contains all configuration variables
 *     of a Chart object. This parameter is passed by value, and a deep
 *     copy is made. Once set, the original object can be modified and
 *     it will not affect this object.
 * @return {Object} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 * @constructor
 */
gadash.GaColumnChart = function(div, ids, metrics, opt_config) {
  this.config = {};
  this.set({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .set(gadash.gviz.defaultChartOptions)
  .set(gadash.gviz.columnChart)
  .set(opt_config);
  return this;
};


/**
 * Make GaColumnChart a subclass of Chart class using chaining inheritance.
 */
gadash.GaColumnChart.prototype = new gadash.Chart();


/**
 * Object containing default value for the chartOptions object.
 * This object is used by all chart wrappers.
 */
gadash.gviz.defaultChartOptions = {
  'chartOptions': {
    height: 300,
    width: 450,
    fontSize: 12,
    curveType: 'function',
    titleTextStyle: {
      fontName: 'Arial',
      fontSize: 15,
      bold: false
    }
  }
};


/**
 * Object containing default value for the Line chart wrapper.
 */
gadash.gviz.lineChart = {
  'type': 'LineChart',
  'chartOptions': {
    pointSize: 6,
    lineWidth: 4,
    areaOpacity: 0.1,
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7'],
    hAxis: {
      format: 'MMM d',
      gridlines: {color: 'transparent'},
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        logScale: 'true',
        count: 3
      },
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Area chart wrapper.
 */
gadash.gviz.areaChart = {
  'type': 'AreaChart',
  'chartOptions': {
    pointSize: 6,
    lineWidth: 4,
    areaOpacity: 0.1,
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7'],
    hAxis: {
      format: 'MMM d',
      gridlines: {
        count: 3,
        color: 'transparent'
      },
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        logScale: 'true',
        count: 3
      },
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Pie chart wrapper.
 */
gadash.gviz.pieChart = {
  'type': 'PieChart',
  'chartOptions': {
    legend: {
      position: 'right',
      textStyle: {
        bold: 'true',
        fontSize: 13
      },
      alignment: 'center',
      pieSliceText: 'none'
    }
  }
};


/**
 * Object containing default value for the bar chart wrapper.
 */
gadash.gviz.barChart = {
  'type': 'BarChart',
  'chartOptions': {
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7'],
    hAxis: {
      gridlines: {
        count: 3,
        color: '#efefef'
      },
      minValue: 0,
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: 'transparent'
      },
      count: 3,
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Column chart wrapper.
 */
gadash.gviz.columnChart = {
  'type': 'ColumnChart',
  'chartOptions': {
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7'],
    hAxis: {
      gridlines: {
        count: 3,
        color: 'transparent'
      },
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        count: 3
      },
      minValue: 0,
      textPosition: 'in'
    }
  }
};
