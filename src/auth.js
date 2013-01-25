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
 * @private
 */
gadash.commandQueue_ = [];


/**
 * Initializes the ga-ez-dash library. This must be called before any of the
 * library is used.
 *
 * Usage:
 * daash.init({
 *   apiKey: 'API Key found in Google APIs Console',
 *   clientId: 'Client ID found in Google APIs Console'
 * })
 * @param {Object} settings - Contains initalization settings.
 */
gadash.init = function(settings) {
  gadash.apiKey = settings.apiKey;
  gadash.clientId = settings.clientId;

  /*
   * Dynamically loads the Google Visualization, and Google JavaScript API
   * Client library. Once both are done loading, the window.gadashInit_ method
   * is executed.
   */
  gadash.util.loadJs_([
    'https://www.google.com/jsapi?autoload=' + encodeURIComponent(
        '{"modules":[{"name":"visualization","version":"1",' +
        '"callback":"__globalCallback","packages":["corechart","table"]}]}'),
    'https://apis.google.com/js/client.js?onload=__globalCallback'
  ], window.gadashInit_, true);
};


/**
 * Callback executed once the Google APIs Javascript client library has loaded.
 * The function name is specified in the onload query parameter of URL to load
 * this library. After 1 millisecond, checkAuth is called.
 * @private
 */
window.gadashInit_ = function() {
  gapi.client.setApiKey(gadash.apiKey);
  window.setTimeout(gadash.checkAuth_, 1);
};


/**
 * Uses the OAuth2.0 clientId to query the Google Accounts service
 * to see if the user has authorized. Once complete, handleAuthResults is
 * called.
 * @private
 */
gadash.checkAuth_ = function() {
  gapi.auth.authorize({
    client_id: gadash.clientId,
    scope: gadash.SCOPES,
    immediate: true}, gadash.handleAuthResult_);
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
 * @private
 */
gadash.handleAuthResult_ = function(authResult) {
  if (authResult) {
    gapi.client.setApiVersions({'analytics': 'v3'});
    gapi.client.load('analytics', 'v3', gadash.loadUserName_);
  } else {
    gadash.handleUnAuthorized();
  }
};


/**
 * Loads user information including the email address of the currently logged
 * in user from the OAuth API. Once loaded, the response is stored and
 * handleAuthorized is called.
 * @private
 */
gadash.loadUserName_ = function() {
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
 * function to render all CoreQuerys in the commandQueue. The execution of the
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
  gadash.executeCommandQueue_();
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
  document.getElementById('authorize-button').onclick = gadash.handleAuthClick_;
};


/**
 * Checks to see if user is authenticated, calls handleAuthResult
 * @return {boolean} false.
 * @param {Object} event - event when button is clicked.
 * @private
 */
gadash.handleAuthClick_ = function(event) {
  gapi.auth.authorize({
    client_id: gadash.clientId,
    scope: gadash.SCOPES,
    immediate: false}, gadash.handleAuthResult_);
  return false;
};


/**
 * Iterates through all commands on the commandQueue and executes them.
 * @private
 */
gadash.executeCommandQueue_ = function() {
  for (var i = 0, command; command = gadash.commandQueue_[i]; ++i) {
    command();
  }
};
