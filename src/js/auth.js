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

  // Move to pub sub -or- custom event.
  gadash.isLoaded = true;
  gadash.util.pubsub.publish(gadash.util.pubsub.libsLoaded);
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
