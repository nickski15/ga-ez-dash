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
    this.executeFunction_();
  } else {
    var executeFunction_ = gadash.util.bindMethod(this, this.executeFunction_);
    gadash.commandQueue_.push(executeFunction_);
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
 * @private.
 */
gadash.Query.prototype.executeFunction_ = function() {
  this.executeHandlers_('onRequest', 'onRequestDefault');
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
 * of the Query object.
 * @param {Object} response - Google Analytics API JSON response.
 */
gadash.Query.prototype.callback = function(response) {

  this.executeHandlers_('onResponse', 'onResponseDefault');

  if (response.error) {
    // API encountered an error.
    this.executeHandlers_('onError', 'onErrorDefault', response.error);

  } else {
    // Successful response.
    this.executeHandlers_('onSuccess', 'onSuccessDefault', response);
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
 * @private
 */
gadash.Query.prototype.executeHandlers_ = function(userFunction,
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

