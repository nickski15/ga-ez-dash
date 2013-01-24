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
 * Provides the Chart object that simplifies querying the
 * Google Analytics Core Reporting API.
 */


/**
 * Namespace for this library if not already created.
 */
var gadash = gadash || {};


/**
 * Stoes user information returned from the OAuth API.
 */
gadash.userInfo = {};


/**
 * Boolean that checks to see if gapi client is loaded.
 */
gadash.isLoaded = false;


/**
 * An array for all the oauth2 scopes to authorize the user for.
 * @const {Array}
 */
gadash.SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email'];


/**
 * List of functions that are queued for execution. This is only used
 * until all the libraries have fully loaded.
 * @type {Array}
 */
gadash.commandQueue = [];


/**
 * Callback executed once the Google APIs Javascript client library has loaded.
 * The function name is specified in the onload query parameter of URL to load
 * this library. After 1 millisecond, checkAuth is called.
 */
window.gadashInit = function() {
  gapi.client.setApiKey(gadash.apiKey);
  window.setTimeout(gadash.checkAuth, 1);
};


/**
 * Sets the API key and Client ID passed by the user.
 * This information can be found in your Google API Console.
 * @param {Object} settings - Contains the API Key and Client ID variables.
 */
gadash.configKeys = function(settings) {
  gadash.apiKey = settings.apiKey;
  gadash.clientId = settings.clientId;
};


/**
 * Uses the OAuth2.0 clientId to query the Google Accounts service
 * to see if the user has authorized. Once complete, handleAuthResults is
 * called.
 */
gadash.checkAuth = function() {
  gapi.auth.authorize({
    client_id: gadash.clientId,
    scope: gadash.SCOPES,
    immediate: true}, gadash.handleAuthResult);
};


/**
 * Handler that is called once the script has checked to see if the user has
 * authorized access to their Google Analytics data. If the user has authorized
 * access, the analytics api library is loaded and the loadUserName
 * function is executed. If the user has not authorized access to their data,
 * the handleUnauthorized function is executed.
 * @param {Object} authResult The result object returned form the authorization
 *     service that determine whether the user has currently authorized access
 *     to their data. If it exists, the user has authorized access.
 */
gadash.handleAuthResult = function(authResult) {
  if (authResult) {
    gapi.client.setApiVersions({'analytics': 'v3'});
    gapi.client.load('analytics', 'v3', gadash.loadUserName);
  } else {
    gadash.handleUnAuthorized();
  }
};


/**
 * Loads user information including the email address of the currently logged
 * in user from the OAuth API. Once loaded, the response is stored and
 * handleAuthorized is called.
 */
gadash.loadUserName = function() {
  gapi.client.request({
    'path': '/oauth2/v2/userinfo'
  }).execute(function(response) {
    gadash.userInfo = response;
    gadash.handleAuthorized();
  });
};


/**
 * Updates the UI once the user has authorized this script to access their
 * data by hiding the authorize button. Also, runs executeCommandQueue
 * function to render all charts in the commandQueue. The execution of the
 * command queue only happens once.
 */
gadash.handleAuthorized = function() {

  var status = 'You are authorized';
  if (gadash.userInfo.email) {
    status += ' as ' + gadash.util.htmlEscape(gadash.userInfo.email);
  }

  document.getElementById('gadash-auth').innerHTML =
      status + ' <button id="authorize-button">Logout</button>';

  document.getElementById('authorize-button').onclick = function() {
    document.location = 'https://accounts.google.com/logout';
  };

  gadash.isLoaded = true;
  gadash.executeCommandQueue();
};


/**
 * Updates the UI if a user has not yet authorized this script to access
 * their Google Analytics data. This function changes the visibility of
 * some elements on the screen. It also adds the handleAuthClick
 * click handler to the authorize-button.
 */
gadash.handleUnAuthorized = function() {
  document.getElementById('gadash-auth').innerHTML =
      '<button id="authorize-button">Authorize Analytics</button>';
  document.getElementById('authorize-button').onclick = gadash.handleAuthClick;
};


/**
 * Checks to see if user is authenticated, calls handleAuthResult
 * @return {boolean} false.
 * @param {Object} event - event when button is clicked.
 */
gadash.handleAuthClick = function(event) {
  gapi.auth.authorize({
    client_id: gadash.clientId,
    scope: gadash.SCOPES,
    immediate: false}, gadash.handleAuthResult);
  return false;
};


/**
 * Iterates through all commands on the commandQueue and executes them.
 */
gadash.executeCommandQueue = function() {
  for (var i = 0, command; command = gadash.commandQueue[i]; ++i) {
    command();
  }
};



/**
* A Chart object is the primary object in this library.
* A Chart accepts an optional configuration object that contains all the
* parameters of the chart. Also changes start and end date of
* the query, if last-n-days is set in the config.
* @param {Object=} opt_config Contains all configuration variables
*     of a Chart object. This parameter is passed by value, and a deep
*     copy is made. Once set, the original object can be modified and
*     it will not affect this object.
* @return {Object} this Returns a reference to the newly instantiated
*     Chart instance. Useful for chaining methods together.
* @constructor
*/
gadash.Chart = function(opt_config) {
  /**
   * The main configuration object.
   * @type {Object}
   */
  this.config = {};

  if (opt_config) {
    gadash.util.extend(opt_config, this.config);
  }

  return this;
};


/**
 * Extends the values in the chart's config object with the keys in
 * the config parameters. If a key in config already exists in the chart,
 * and the value is not an object, the new value overwrites the old.
 * @param {Object} config The config object to set inside this object.
 * @return {Object} The current instance of the Chart object. Useful
 *     for chaining methods.
 */
gadash.Chart.prototype.set = function(config) {
  gadash.util.extend(config, this.config);
  return this;
};


/**
 * First checks to see if the GA library is loaded. If it is then the
 * chart can be rendered right away. Otherwise, other operations are queued,
 * so the render command is pushed to the command queue to be executed in
 * the same order as originally called.
 * @this Points to the current chart instance.
 * @return {Object} The current instance of this chart object. Useful for
 *     chaining methods.
 */
gadash.Chart.prototype.render = function() {

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
 * is bound to the Chart instance so a reference back to this chart is
 * maintained within the callback.
 */
gadash.Chart.prototype.renderFunction = function() {
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
gadash.Chart.prototype.setDefaultDates = function(config) {
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
 * this (ie this chart object instance). If not defined, just use
 * the default callback. The entire JSON response from the API
 * is passed to either defined or default callback.
 * @param {Object} response - Google Analytics API JSON response.
 */
gadash.Chart.prototype.callback = function(response) {
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
gadash.Chart.prototype.defaultOnError = function(message) {

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

    // Prints chart divContainer and message to error div.
    errorDiv.innerHTML += this.config.divContainer + ' error: ' +
        message + '<br />';
  }
};


/**
 * Default callback for creating Google Charts with a response. First, the
 * response is put into a DataTable object Second, the corresponding chart
 * is returned. The two are then combined to draw a chart that is populated
 * with the GA data.
 * @param {Object} resp A Google Analytics API JSON response.
 */
gadash.Chart.prototype.defaultOnSuccess = function(resp) {
  var dataTable = gadash.util.getDataTable(resp, this.config.type);
  var chart = gadash.util.getChart(this.config.divContainer, this.config.type);
  gadash.util.draw(chart, dataTable, this.config.chartOptions);
};
