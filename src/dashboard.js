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

