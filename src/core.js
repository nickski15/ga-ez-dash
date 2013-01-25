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
