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
 *   'query': {
 *     'lastNdays': 28,
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
  this.config.actualQuery = gadash.core.getCoreQueryObj(this.config);
  var request = gapi.client.analytics.data.ga.get(this.config.actualQuery);
  request.execute(gadash.util.bindMethod(this, this.callback));
};


/**
 * Returns the actual query values issued to the Google Analytics Core
 * reporting API as an object. This figures out the default dates.
 * It also removes any unused keys. It also properly maps camel
 * cased values into their hyphenated equivalents.
 * @param {object} config The configuration object.
 * @return {Object} A new object that for the actual query parameters that
 *     should be sent to the GA API.
 */
gadash.core.getCoreQueryObj = function(config) {
  var actualQuery = {};

  if (config.query.ids) {
    actualQuery.ids = config.query.ids;
  }

  if (config.query.metrics) {
    actualQuery.metrics = config.query.metrics.split(' ').join(',');
  }

  if (config.query.dimensions) {
    actualQuery.dimensions = config.query.dimensions.split(' ').join(',');
  }

  if (config.query.filters) {
    actualQuery.filters = config.query.filters;
  }

  if (config.query.segment) {
    actualQuery.segment = config.query.segment;
  }

  if (config.query.sort) {
    actualQuery.sort = config.query.sort.split(' ').join(',');
  }

  if (config.query.startIndex) {
    actualQuery['start-index'] = config.query.startIndex;
  }
  if (config.query.maxResults) {
    actualQuery['max-results'] = config.query.maxResults;
  }

  /* Handles setting default and lastNdays dates.
   * If lastNdays has been set, Updates the start and end date.
   * If neither start not end date is set, a default of the last
   * 28 days is used. Otherwise the original dates are used.
   */
  if (config.query.lastNdays) {
    actualQuery['end-date'] = gadash.util.lastNdays(0);
    actualQuery['start-date'] = gadash.util.lastNdays(config.query.lastNdays);

  } else if (!config.query.startDate || !config.query.endDate) {
    // Provide a default date range of last 28 days.
    actualQuery['end-date'] = gadash.util.lastNdays(0);
    actualQuery['start-date'] = gadash.util.lastNdays(28);

  } else {
    // Both exist. Move the dates over.
    actualQuery['end-date'] = config.query.endDate;
    actualQuery['start-date'] = config.query.startDate;
  }

  return actualQuery;
};


/**
 * Handles setting default and lastNdays dates.
 * If lastNdays has been set, Updates the start and end date.
 * If neither start not end date is set, a default of the last
 * 28 days is used.
 * @param {Object} config A config object.
 * @this Points to the GaQuery object.
 */
gadash.core.setDefaultDates = function(config) {
  if (config['lastNdays']) {
    config.query['endDate'] = gadash.util.lastNdays(0);
    config.query['startDate'] =
        gadash.util.lastNdays(config['lastNdays']);
  } else {
    if (!config.query['startDate'] || !config.query['endDate']) {
      // Provide a default date range of last 28 days.
      config.query['endDate'] = gadash.util.lastNdays(0);
      config.query['startDate'] = gadash.util.lastNdays(28);
    }
  }
};

