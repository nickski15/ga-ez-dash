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
 * Stores all the initalization configurations.
 */
gadash.auth.config = {};


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
    var version = gadash.auth.config.version || 'v3';
    gapi.client.load('analytics', version, gadash.auth.loadUserName_);
  } else {

    if (gadash.util.getType(gadash.auth.config.onUnAuthorized) == 'function') {
      if (gadash.auth.config.onUnAuthorized() !== false) {
        gadash.auth.onUnAuthorizedDefault();
      }
    } else {
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

  if (gadash.util.getType(gadash.auth.config.onAuthorized) == 'function') {
    if (gadash.auth.config.onAuthorized() !== false) {
      gadash.auth.onAuthorizedDefault();
    }
  } else {
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
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * Provides the Abstract Query class to query the Google Analytics APIs. This
 * class defines all the interfaces and logic flow of this object. To make
 * this class functional, various methods need to be defined.
 */



/**
 * A Core Query object is the base object to perform a Core Reporting API query.
 * It accepts an optional configuration object that contains an
 * object defining the query. Also changes start and end date of
 * the query, if last-n-days is set in the config.
 * Usage:
 * var cq = new gadash.Query({
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
 * @return {Object} Returns a reference to the newly instantiated
 *     Chart instance. Useful for chaining methods together.
 * @constructor
 */
gadash.Query = function(opt_config) {
  this.config = {};
  this.setConfig(opt_config);
  return this;
};


/**
 * Extends the values in the Query's config object with the keys in
 * the config parameters. If a key in config already exists in the Query,
 * and the value is not an object, the new value overwrites the old.
 * @param {Object} config The config object to set inside this object.
 * @return {Object} The current instance of the Chart object. Useful
 *     for chaining methods.
 */
gadash.Query.prototype.setConfig = function(config) {
  gadash.util.extend(config, this.config);
  return this;
};


/**
 * First checks to see if the GA library is loaded. If it is then the
 * Query can be executed right away. Otherwise, other operations are queued,
 * so the execute command is pushed to the command queue to be executed in
 * the same order as originally called.
 * @param {Object=} opt_config An optional query configuration object.
 * @this Points to the current Query instance.
 * @return {Object} The current instance of this Query object. Useful for
 *     chaining methods.
 */
gadash.Query.prototype.execute = function(opt_config) {
  if (opt_config) this.setConfig(opt_config);

  // If the client library has loaded.
  if (gadash.isLoaded) {
    this.executeFunction();
  } else {
    var executeFunction = gadash.util.bindMethod(this, this.executeFunction);
    gadash.commandQueue_.push(executeFunction);
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
gadash.Query.prototype.executeFunction = function() {
  this.executeHandlers('onRequest', 'onRequestDefault');
};


/**
 * Default callback executed just before a query to the API is made.
 * This is a no-op and should be overriden by sub-classes.
 */
gadash.Query.prototype.onRequestDefault = function() {};


/**
 * Callback function that is called after a GA query is executed.
 * First, the function checks to see if there are any errors on the
 * response.
 * If an error occured, if the config object contains a method
 * named onError, it is executed and is passed the error object returned
 * from the API. If the the onError does not return false, the default
 * error handler is executed.
 * If the API query was successful, if the config object contains a method
 * named onSuccess, it is executed nd passed the response form the API. If
 * the onSuccess function does not return false, the onSuccessDefault
 * function is called.
 * Both the onSuccess and onError functions are executed in the context
 * of the Query object.
 * @param {Object} response - Google Analytics API JSON response.
 */
gadash.Query.prototype.callback = function(response) {

  this.executeHandlers('onResponse', 'onResponseDefault');

  if (response.error) {
    // API encountered an error.
    this.executeHandlers('onError', 'onErrorDefault', response.error);

  } else {
    // Successful response.
    this.executeHandlers('onSuccess', 'onSuccessDefault', response);
  }
};


/**
 * Helper method to execute default and user defined methods.
 * First checks to see if a user function is defined on the config object.
 * If it is, it's executed in the context of this object and passed the
 * args parameter. Next if the user function does not return false,
 * the default function handler is executed in the context of this object,
 * and also passed the args parameter.
 * @param {String} userFunction The name of the user defined function to be
 *     found on the config object.
 * @param {String} defaultFunction The name of the defaul function to be
 *     executed if no user function is found.
 * @param {Object=} opt_args The parameter to pass to both functions above.
 */
gadash.Query.prototype.executeHandlers = function(userFunction,
    defaultFunction, opt_args) {

  var userFunc = this.config[userFunction];
  var defaultFunc = this.config[defaultFunction];

  if (gadash.util.getType(userFunc) == 'function') {
    if (gadash.util.bindMethod(this, userFunc)(opt_args) !== false &&
        defaultFunc) {
      gadash.util.bindMethod(this, defaultFunc)(opt_args);
    }
  } else if (defaultFunc) {
    gadash.util.bindMethod(this, defaultFunc)(opt_args);
  }
};


/**
 * Default callback once the API has returned with a response.
 * This is a no-op and should be overriden by sub-classes.
 */
gadash.Query.prototype.onResponseDefault = function() {};


/**
 * Default handler if there is an error with the query.
 * This is a no-op and should be overridden by a developer.
 * @param {String} error The error object returned by the API.
 */
gadash.Query.prototype.onErrorDefault = function(error) {};


/**
 * Default callback for creating Google Charts with a response.
 * This is a no-op and should be overridden by a developer.
 * @param {Object} response A Google Analytics API JSON response.
 */
gadash.Query.prototype.onSuccessDefault = function(response) {};

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
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * Provides the CoreQuery object that simplifies querying the
 * Google Analytics Core Reporting API.
 */


// Core namespace.
gadash.core = gadash.core || {};


/**
 * Core Query Builder. This returns a basic object to query the Core Reporting
 * API. Developers must override the onSuccess handler to manage the results of
 * the API. Usage:
 *
 * gadash.getCoreQuery({
 *   'last-n-days': 28,
 *   'query': {
 *     'ids': 'ga:1174',
 *     'metrics': 'ga:pageviews'
 *   },
 *   'onSuccess': handleData
 * });
 *
 * function handleData(results) {
 *   console.log(results);
 * }
 *
 * @param {Object=} opt_config An optional query configuration object.
 * @return {gadash.Query} A Query object configured to query the
 *     Core Reporting API.
 */
gadash.getCoreQuery = function(opt_config) {
  return new gadash.Query({
    'onRequestDefault': gadash.core.onRequestDefault,
    'onErrorDefault': gadash.onErrorDefault
  }).setConfig(opt_config);
};


/**
 * Requests data for the Core Reporting API. This first updates the
 * dates for the configuration object. It then creates a query based
 * on the query parameter in the config object. Finally it executes the
 * query and sets the callback to this.callback.
 * @this {gadash.Query} The Query object.
 */
gadash.core.onRequestDefault = function() {
  gadash.core.setDefaultDates(this.config);
  var request = gapi.client.analytics.data.ga.get(this.config.query);
  request.execute(gadash.util.bindMethod(this, this.callback));
};


/**
 * Handles setting default and last-n-days dates.
 * If last-n-days has been set, Updates the start and end date.
 * If neither start not end date is set, a default of the last
 * 28 days is used.
 * @param {Object} config A config object.
 * @this Points to the Query object.
 */
gadash.core.setDefaultDates = function(config) {
  if (config['last-n-days']) {
    config.query['end-date'] = gadash.util.lastNdays(0);
    config.query['start-date'] =
        gadash.util.lastNdays(config['last-n-days']);
  } else {
    if (!config.query['start-date'] || !config.query['end-date']) {
      // Provide a default date range of last 28 days.
      config.query['end-date'] = gadash.util.lastNdays(0);
      config.query['start-date'] = gadash.util.lastNdays(28);
    }
  }
};


/**
 * Checks to see if there is an element with the ID of errors.
 * If not, a div is created with this ID.
 * The error message is formatted and printed to this div.
 * @param {String} error The error object returned by the API.
 */
gadash.onErrorDefault = function(error) {
  var errorDiv = document.getElementById('errors');

  // Create error div if not already made.
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.style.color = 'red';
    errorDiv.setAttribute('id', 'errors');
    errorDiv.innerHTML = 'ERRORS:' + '<br />';
    document.body.appendChild(errorDiv);
  }

  // TODO(nm): Need better error handling. + html escape.
  // Prints Query divContainer and message to error div.
  errorDiv.innerHTML += ' error: ' + error.code + ' ' +
      error.message + '<br />';
  //errorDiv.innerHTML += this.config.divContainer + ' error: ' +
  //    message + '<br />';
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
    'cENxQB3bwt/E1LmsYMJSbZFxJggLujQAAh+QQJCgAAACwAAAAAIAAgAAAH/4AAgoOEgw',
    'cVVFQpB4WNjo4PEEkoKEsvD4+ZjQI0RhoSEhpGEAKapgAVSxOgoBNJFaeFBg4EFQJBRk',
    'ysoEZBsYIHDg0oDFhNREa7EiW9vwADJKsSOihOSdKgLq+CFRWMjwI8G7sTGTwoMKA2W0',
    'OlqUkDmQhCIcokFUVaDAwzBAjcUaI4yCTAyjhWK3JgQpAiBYJvAG4FKZWJgpJPEmAwgO',
    'BM3osnDCIoSIChYyMMBYYQCUKg1j+ThDA4MbIAhQVbMAsdGBKhBKgNJyDGQgDBAgGKD3',
    '5gK0ECk7MORkIogAXgAY6lTTt6iCKDRDwAB5r0lMBiQwuhpxB0MUoRgAEnVZxq3syJFg',
    'DKIQQM5NQk4IAADA/q7nXLAQkUf6ceOOR7ZcGKI1GyCB6UwgKJESUfVVCQTsIRKE4dHb',
    'DSo0SNJhWjsJqAJHPEtmBHmJDAZUomDDhEMIGxIEGpAwWECCnQtoOSCEu+asYRRcoVvQ',
    'A8SDGxIgoVQhVqmTqAgQJOsDx6gOrBY7LJISBAgRhivmOFHCFzUB2MvUiR+fQHBwIAIf',
    'kECQoAAAAsAAAAACAAIAAAB/+AAIKDhIUAB4aJiokHFUVdQQ+Lk4YHDksLNUYjFZSeAB',
    'RPKxISJUAtkgcPGAieDwMFAwgCPkBMpBI6HwMYRBY4Jw4CixhOClsKPBUtXLilUQQnWy',
    'ImGwovX4m0CyUlOgwJTRHOLk8XESW4LgpUiQYNOrgmOUEqR6QsEU4ZJs4SCxwQFUqRBA',
    'YuDRkMVLBghMGHLhWWxHO2ocWwQghOcIkhgQkIJ4gOKMQA4AGUe7hYAPFxsVAFFQt6RM',
    'gxQFEXFDbkfeigCEGFJi2GVBBoCMMVIz1CbLhBpJUhBBhCEu1ZwIkQHhSmCsJAQIiQAi',
    '09IZilrcmWEDKMQPhUSFW2QQa1VGggpUGLU7YAPEBxYmBQBRLpSim4y5YGil2DEFjg0m',
    '2DhbCfKnBoSqgCDiNGLNTEO+lACg8OOnEeTdoTBgNaSw86QADJEh+SKKUg4CU1oQ5RNM',
    'AACLnQgxw1lFCYBGEDKRNQYitKoQBGhCKTgmyBUeLj3QcUhg4ScEUKFNGKHjiJknkzAA',
    'wjoiQhQNQnSUoIKATpO8jBuCM53qsmVIBBiSM46LefIAZcoB57AxaCQXaEJUhaIAAh+Q',
    'QJCgAAACwAAAAAIAAgAAAH/4AAgoOEhQcCB4WKi4yCBgRTTRSJjZWFDxdbG0BLBJSWlQ',
    'dEDCUSEmIZFaCKCGAIgggtYqYSJVEOAhVFEEEPlgMtGRdBAghOIrS2BQQqDAtRLSmNFS',
    'obGj1JHQceYzC1GxYvWEemJRFTr4tFC7Q1CQAITQoLDBYePDW0EhpJqosvNZiY2mBF0I',
    'EKHSg8ENCihz5bHhhVUGCihIkoBBg1WVDKlIkZ/hQdeKHCyJImvhYN0NIjhgQYKDikW3',
    'TQQYWZigQ4yGGEgQIhQVLgXLUIQ5AuV3AsyXBlwCcwHQYMtXQAgoIeLkwAQeJvAI4tRl',
    'oYIAqgAgkX+jZcACBgCoiXDLUyEiWQTx8MBfAshBjogywBhw/JADhAA8WEIwqCkA0SgY',
    'U+HUkEpeDRAAeRqY0e5GhpCgaDIYMQpDDwiaiHHQt6bIhyZSxZRge7OJlCAMNrUAdKK6',
    'pQIIxuRohAdViyQIEnS0GQJMA86MAVLqcspGyUYIEK17B9RNAB5MpMASlsEwJGRIClFC',
    '1ICAkp4EUDCyEFBQeFoMKDTwZUHInQ5fftQQ9YUANG/1VCAQcviFcgcP4tWGAgACH5BA',
    'kKAAAALAAAAAAgACAAAAf/gACCg4SFhoeIiQAYQURBD4qRhQ88UREKPBiSkgcFRjASMF',
    'FFB4OlmwgPpwc+GxKvQDwCAAgdRUGaiQcOFxZEkAcvESUSJQxdAgYJCgxRIxWJHVg9Ml',
    'EQpRU/QGILFhUIQ1s6oQtWkIdDNa89FucVHBZN0Bg/Mq8SKzPQhgdEwxIbTpwTdAqAgR',
    'xH7rl4MgBRCgsoIjToULAQAh4LSjApAUJILn4ViNAYUNFQBQsMNkTYQVHRgZKHBFR4YY',
    'UHgQEYYG4CmWDHEgsEEBR6uXMQghYoTGgQoYDAqQdELFjZt7ODEWKvTGRIAWCXAjEgLg',
    'yUBKHHvWJGOnSFsECCCxVcyHcScXWvRBQqgjwkqcFgitCdA6KMeyUGSS4BHXy8MFCUVo',
    'IqXEKASFKg4AEBOhEdMBAEQgsoP1oEmdWYEAICOaKgUGDBQc7ShYJgEfEKxgIhcQ8d6P',
    'DCS2YEFjYwuSeKAGlDHT4sQEK1kAEtg++BsHK8EIEtExSoPZRiSfRXNaZUJ1Thwo1MhA',
    'S8Bs7lrA4jpBI9+Jb+BVBBQZ70sFFCQwTcpT0AkROlCFAADlEYocAJze0kgH0OmFKBAw',
    'VQ8FFpAqgC24YcdhgIACH5BAkKAAAALAAAAAAgACAAAAf/gACCg4SFhoeIiYIHD1+Kj4',
    'cYL0JTFAKQmAddRj1AOQOYkA9QJhIlW0QHgweqkAeXgw8WMqZGBKoHFC9EFa2IBl1XQb',
    'ACRWYgDBYVAAcESgsRM0G+hQIJWyBJHoMIDlMQvQApSLQSG0IYiBgNExILPtSFFAolEh',
    'IrWsuHCC0RPQq3ElVoUIoFF2UCr1jo8kARAghSNtTAQgDWoQMIMFhM9IDAFR4OGobKxO',
    'rBg40jESEIcuXECwOEDmCogCAlAAEQonDpkQwmswpCZjQRGWrAk3amUEAQhGAIChkfQI',
    '0kgKKevR4nBhFQEAGKvlBBolhlAoIHtwJdpI5MIQSIDhgiyT50KBTP1QMPFqJE2VGkps',
    '1BAgb4GNGiCwECFVCmPBAkw4IeIG4wfFS3UAoLG+xJCJFkrkAeBPwCAFNg14AvBaLA0C',
    'whwpDKN4cwyFCGGYUfDLiAUJCgSVXWC5rAZoxkCoYDFTBrnmDkwo0VmmFEIaDoQIqGOH',
    '9rlpGhRZUjOiZEuJAilAAeNVhLgIHFwZAdCpJM+QpJQJMITFjrmEGzQocK6aQUhBIuaB',
    'YDCC0Q9RcADzRhhAklwACCCp4tGMsLGUShxAUdKFZIIAAh+QQJCgAAACwAAAAAIAAgAA',
    'AH/4AAgoOEhYaHiImKi4wCFR0pB4yTggUZChYVlIwIFhsaKBCSm4mdIiULNKMAGBQUD4',
    'wYYbCDBElGUJqCFRZSCk4pigZXWjwYgwgUBRUCggddDDAuRkTNiARGRwpBig8jIRISNT',
    'wIiQMqEUgDis8MLiZRRauGAg4cQdaJBk4kT8aLBwTMS/SAwgBapBIq7DaAgoGBACBOqi',
    'AkSpQfHlY9cABB16YHToDAkLABioFBA3ZEaSIxUYUMLsKViEJlUIoTOwi0RGTgBzgJLp',
    'R4ZFWhHKkDL6L0EIGixTFDAXcaegDhRw4eQwUJoOBjxBUCJxcJEIAgRQWEg+qpWMBlQ5',
    'QrYdEPpSiSoGPLCkh6lAinwQiNfIQqjDBSg0GODhAP0EARrnGIHBUOgPFSFAACDhFGlt',
    'hgIVghBFNqxGgsQQMWBzRUGMEUpAKUnxJ0KOkAdQgD0hJWLJlixESJElxUELHQo/GED7',
    'QNeXhigonMBRYyyCC9oAUHIy5KwAAyIi4hBEOicJkQIgKUISR0kBZhYcAUKSiMWKCQCM',
    'PwGTmmuJqxgvSGFghgQEAXBETGDgYVpFDOAzwssFduUhAwSEALpWDBFhvUoMAQaC0kiH',
    '1XcNCBUYoEAgAh+QQJCgAAACwAAAAAIAAgAAAH/4AAgoOEhYaHiImKi4wAB18HjZIADw',
    'Q+HZGTi0FPKFAVmotEKCEfA4QPBg+Nj5mCFRZPPBiDFS0NLaCKAh0+A64CKRS0ggJDDC',
    'YMCQiKBhZbLcSICE5cEhsXq4kPTTtEzIkHBQoRJASuiBgV2ooIlgTshQcCCAIH6Lv26Q',
    '4+Vl0UAkIdejAESwQgKHZ4wLfoAAYMAQEIIBJlhQQJJUTk0NXInYUcPkClsNDjoskIRB',
    'giCoJFxJEtHBAM+ODC5EUuHFQaOjBkwUUxPwxUaGDCpgQQTSI2JGBERwkQQh48uBKhhE',
    'kYChaySjEiCooMDu51QFJjAgwZDKZIa1SBSJcO4OB4nVCBRYUFHwUqKGV0z9CDCgVOfN',
    'gSBQeBvYUEVOigNxGCF1GOlIDBRUuHaUR2KMjwDVEKHEdsApkCjtABB1gkH1FQQGWFJz',
    'psirBQIUUQAlRWCfDh8+ICHqUJVchQ9CKTDSOCXJCC4kMTDAiGVMW4wEfwQQg4MNDBRM',
    'LqJiMWwJBgIsqLBx1UbDCxYYnWQ7aiRGBAggMBmia5WDCAoICFJRYQcJ1pFRDAQRMO2K',
    'ZEbBf1AIUBACBQAQWNLSLAhZHA0kN3JUTAQzwCRVjAEkBwwYAFFIRoCC9XXBCSToQEAg',
    'A7AAAAAAAAAAAA'].join('');
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
 * @author nickski15@gmail.com (Nick Mihailovski)
 * @author laurent1jacquot@gmail.com (Laurent Jacquot)
 * @author ooahmad@gmail.com (Osama Ahmad)
 *
 * @fileoverview
 * This file provides logic to transform the data returned from the
 * Core Reporting API into Google Visualization Charts. It also provides
 * the following chart generation methods:
 *   gadash.getCoreChart();
 *   gadash.getCoreLineChart();
 *   gadash.getCorePieChart();
 *   gadash.getCoreBarChart();
 *   gadash.getCoreColumnChart();
 * .
 */


/**
 * Namespace.
 * @type {Object}
 */
gadash.gviz = gadash.gviz || {};


/**
 * Adds a loading message to the div in which the chart is executed.
 * Then queries the Core Reporting API.
 * @this {gadash.Query} The base Query object.
 */
gadash.gviz.onRequestDefault = function() {
  document.getElementById(this.config.divContainer).innerHTML = [
    '<div class="ga-loader" ',
    'style="color:#777;font-size:18px;overflow:hidden">',
    '<img style="display:block;float:left" src="',
    gadash.util.getLoaderUri(), '">',
    '<div style="margin:6px 0 0 12px;float:left">Loading...</div></p>'
  ].join('');
  gadash.util.bindMethod(this, gadash.core.onRequestDefault)();
};


/**
 * Removes all content from the div in which the chart is executed.
 * @this {gadash.Query} The base Query object.
 */
gadash.gviz.onResponseDefault = function() {
  document.getElementById(this.config.divContainer).innerHTML = '';

};


/**
 * Default callback for creating Google Charts with a response. First, the
 * response is put into a DataTable object Second, the corresponding chart
 * is returned. The two are then combined to draw a query that is populated
 * with the GA data.
 * @param {Object} response A Google Analytics API JSON response.
 * @this {gadash.Query} The base Query object.
 */
gadash.gviz.onSuccessDefault = function(response) {
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
 * @param {String} id The ID of the HTML element in which to execute
 *     the chart.
 * @param {String} chartType The type of the Chart to execute.
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
 * The standard controller configuration for Core Reporting Charts.
 * This should be passed to the constructor of all Query objects
 * for gviz Core Reporting API Charts.
 * @type {Object}
 */
gadash.gviz.coreChartConfig = {
  'onRequestDefault': gadash.gviz.onRequestDefault,
  'onResponseDefault': gadash.gviz.onResponseDefault,
  'onSuccessDefault': gadash.gviz.onSuccessDefault,
  'onErrorDefault': gadash.onErrorDefault
};


/**
 * Base Chart for the Core Reporting API.
 * @param {opt_config=} opt_config An optional configuration object.
 * @return {gadash.Query} The newly created Query object.
 */
gadash.getCoreChart = function(opt_config) {
  return new gadash.Query()
      .setConfig(gadash.gviz.coreChartConfig)
      .setConfig(opt_config);
};


/**
 * Line Chart Wrapper. Creates a Query object and sets default settings specific
 * to line charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30 if opt_config does
 *         not specify the entries.
 * @param {String} div - contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids - contains the TABLE_ID to access analytics data.
 * @param {String} metrics - contains the type of metrics to be used in chart.
 * @param {Object=} opt_config - An optional configuration object.
 * @return {gadash.Query} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreLineChart = function(div, ids, metrics, opt_config) {
  return new gadash.Query(gadash.gviz.coreChartConfig).setConfig({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.areaChart)
  .setConfig(opt_config);
};


/**
 * Pie Chart Wrapper. Creates a Query object and sets default settings
 * specific to pie charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div Contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids Contains the TABLE_ID to access analytics data.
 * @param {String} metrics Contains the type of metrics to be used in chart.
 * @param {String} dimensions Contains the dimensions to be used in chart.
 * @param {Object=} opt_config An optional configuration object.
 * @return {gadash.Query} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCorePieChart = function(div, ids, metrics, dimensions, opt_config) {
  return new gadash.Query(gadash.gviz.coreChartConfig).setConfig({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'sort': '-' + metrics,
      'dimensions': dimensions,
      'max-results': 5
    }
  })
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.pieChart)
  .setConfig(opt_config);
};


/**
 * Bar Chart Wrapper. Creates a Query object and sets default settings
 * specific to line charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div Contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids Contains the TABLE_ID to access analytics data.
 * @param {String} metrics Contains the type of metrics to be used in chart.
 * @param {Object=} opt_config An optional configuration object.
 * @return {gadash.Query} a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreBarChart = function(div, ids, metrics, opt_config) {
  return new gadash.Query(gadash.gviz.coreChartConfig).setConfig({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.barChart)
  .setConfig(opt_config);
};


/**
 * Bar Column Wrapper. Creates a Query object and sets default settings
 * specific to bar charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'last-n-days': 30.
 * @param {String} div Contains the <div> tag id value to indicate where
 *     the chart should appear on a webpage.
 * @param {String} ids Contains the TABLE_ID to access analytics data.
 * @param {String} metrics Contains the type of metrics to be used in chart.
 * @param {Object=} opt_config An optional configuration object.
 * @return {gadash.Query} a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreColumnChart = function(div, ids, metrics, opt_config) {
  return new gadash.Query(gadash.gviz.coreChartConfig).setConfig({
    'divContainer': div,
    'query': {
      'ids': ids,
      'metrics': metrics,
      'dimensions': 'ga:date'
    }
  })
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.columnChart)
  .setConfig(opt_config);
};


/**
 * Object containing default value for the chartOptions object.
 * This object is used by all chart wrappers.
 */
gadash.gviz.defaultGvizChartOptions = {
  'chartOptions': {
    height: 300,
    width: 450,
    fontSize: 12,
    curveType: 'function',
    chartArea: {'width': '100%'},
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
    colors: ['#058dc7', '#d14836'],
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
    colors: ['#058dc7', '#d14836'],
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
    colors: ['#058dc7', '#d14836'],
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
    },
    chartArea: {'width': '90%'}
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
 * @author nickski15@gmail.com (Nick Mihailovski)
 *
 * @fileoverview
 * Provides the Dashboard object that allows you manage
 * multiple Control and/or  Query objects as one. e.g. you can
 * create 5 Query objects, add them to a Dashboard object and manage
 * all 5 queries with a single command.
 */


/**
 * Returns a new instance of a Dashboard object.
 * @param {Object=} opt_objects Either a single or array of Query or Control
 *     objects.
 * @return {gadash.Dashboard} The new Dashboard instance.
 */
gadash.getDashboard = function(opt_objects) {
  return new gadash.Dashboard().add(opt_objects);
};



/**
 * Creates a new Dashboard object for managing multiple queries.
 * @return {gadash.Dashboard} this object. Useful for chaining methods.
 * @constructor.
 */
gadash.Dashboard = function() {
  this.controls_ = [];
  this.charts_ = [];
  return this;
};


/**
 * Adds a new Control or Query to the dashboard. Can be a single object,
 * or an array of objects.
 * For example, the following are valid:
 *   dash.add(chart1);
 *   dash.add([chart1, chart2, chart3])
 *
 * This function checks the objects interface to determine whether a
 * single parameter for object is either a Control or Query.
 * @param {Object|Array} object An optional list of gadash.Query or
 *     gadash.Control objects.
 * @return {gadash.Dashboard} this object. Useful for chaining methods.
 */
gadash.Dashboard.prototype.add = function(object) {

  if (gadash.util.getType(object) == 'array') {
    for (var i = 0, obj; obj = object[i]; ++i) {
      this.add(obj);
    }

  } else if (object.getConfig && object.getValue) {
    // Control object.
    this.charts_.push(object);

  } else if (object.setConfig && object.execute) {
    // Query object.
    this.charts_.push(object);
  }
  return this;
};


/**
 * Returns all the controls in the dashboard.
 * @return {Array.<gadash.Control>} The charts in the dashboard.
 */
gadash.Dashboard.prototype.getControls = function() {
  return this.charts_;
};


/**
 * Returns the config object for all controls as a single object.
 * @return {Object} A single config object for all controls.
 */
gadash.Dashboard.prototype.getConfig = function() {
  var config = {};
  for (var i = 0, control; control = this.controls_[i]; ++i) {
    gadash.util.extend(control.getConfig(), config);
  }
  return config;
};


/**
 * Returns all the charts in the dashboard.
 * @return {Array.<gadash.Query>} The charts in the dashboard.
 */
gadash.Dashboard.prototype.getCharts = function() {
  return this.charts_;
};


/**
 * Calls the setConfig method on all the charts in the dashboard.
 * @param {Object} config The configuration object to set on all the
 *     charts.
 * @return {gadash.Dashboard} this object. Useful for chaining methods.
 */
gadash.Dashboard.prototype.setConfig = function(config) {
  for (var i = 0, chart; chart = this.charts_[i]; ++i) {
    chart.setConfig(config);
  }
  return this;
};


/**
 * Executes all the chart objects. This first gets all the current
 * configuration values from any controls, then overrides them with
 * the opt_config parameter. Finally each chart is executed.
 * @param {Object=} opt_config An optional configuration object to set
 *     on all the charts before rendering them.
 * @return {gadash.Dashboard} this object. Useful for chaining methods.
 */
gadash.Dashboard.prototype.execute = function(opt_config) {
  var config = this.getConfig();
  if (opt_config) {
    gadash.util.extend(opt_config, config);
  }
  for (var i = 0, chart; chart = this.charts_[i]; ++i) {
    chart.execute(config);
  }
  return this;
};

