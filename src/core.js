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
    gadash.commandQueue_.push(renderFunction);
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
  this.executeHandlers('onRequest', 'onRequestDefault');

  this.setDefaultDates(this.config);
  var request = gapi.client.analytics.data.ga.get(this.config.query);
  request.execute(gadash.util.bindMethod(this, this.callback));
};


/**
 * Default callback executed just before a query to the API is made.
 * This is a no-op and should be overriden by sub-classes.
 */
gadash.CoreQuery.prototype.onRequestDefault = function() {};


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
 * of the CoreQuery object.
 * @param {Object} response - Google Analytics API JSON response.
 */
gadash.CoreQuery.prototype.callback = function(response) {

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
 * if it is, it's executed in the context of this object and passed the
 * args parameter. Next if the user function does not return false,
 * the default function handler is executed in the context of this object,
 * and also passed the args parameter.
 * @param {String} userFunction The name of the user defined function to be
 *     found on the config object.
 * @param {String} defaultFunction The name of the defaul function to be
 *     executed if no user function is found.
 * @param {Object=} opt_args The parameter to pass to both functions above.
 */
gadash.CoreQuery.prototype.executeHandlers = function(
    userFunction, defaultFunction, opt_args) {

  if (gadash.util.getType(this.config[userFunction]) == 'function') {
    if (gadash.util.bindMethod(this,
        this.config[userFunction])(opt_args) !== false) {
      this[defaultFunction](opt_args);
    }
  } else {
    this[defaultFunction](opt_args);
  }
};


/**
 * Default callback once the API has returned with a response.
 * This is a no-op and should be overriden by sub-classes.
 */
gadash.CoreQuery.prototype.onResponseDefault = function() {};


/**
 * Checks to see if there is an element with the ID of errors.
 * If not, a div is created with this ID.
 * The error message is formatted and printed to this div.
 * @param {String} error The error object returned by the API.
 */
gadash.CoreQuery.prototype.onErrorDefault = function(error) {
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
  // Prints CoreQuery divContainer and message to error div.
  errorDiv.innerHTML += ' error: ' + error.code + ' ' +
      error.message + '<br />';
  //errorDiv.innerHTML += this.config.divContainer + ' error: ' +
  //    message + '<br />';
};


/**
 * Default callback for creating Google Charts with a response.
 * This is a no-op and should be overridden by a developer.
 * @param {Object} response A Google Analytics API JSON response.
 */
gadash.CoreQuery.prototype.onSuccessDefault = function(response) {};
