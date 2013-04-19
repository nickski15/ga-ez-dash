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
 * @return {gadash.GaQuery} A GaQuery object configured to query the
 *     Core Reporting API.
 */
gadash.getCoreQuery = function(opt_config) {
  return new gadash.GaQuery({
    'onRequestDefault': gadash.core.onRequestDefault,
    'onErrorDefault': gadash.onErrorDefault
  }).setConfig(opt_config);
};


/**
 * Requests data for the Core Reporting API. This first updates the
 * dates for the configuration object. It then creates a query based
 * on the query parameter in the config object. Finally it executes the
 * query and sets the callback to this.callback.
 * @this {gadash.GaQuery} The GaQuery object.
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
 * @this Points to the GaQuery object.
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
  // Prints GaQuery elementId and message to error div.
  errorDiv.innerHTML += ' error: ' + error.code + ' ' +
      error.message + '<br />';
  //errorDiv.innerHTML += this.config.elementId + ' error: ' +
  //    message + '<br />';
};

