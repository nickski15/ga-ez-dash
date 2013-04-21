// Copyright 2013 Google Inc. All Rights Reserved.

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
 * Provides the GaComponent object that allows you manage
 * multiple GaControl and/or GaQuery objects as one. e.g. you can
 * create 5 GaQuery objects, add them to a GaComponent object and manage
 * all 5 queries with a single command. GaComponents also support
 * embedding other dashboards.
 */


/**
 * Returns a new instance of a GaComponent object.
 * @param {Object=} opt_objects Either a single or array of objects.
 *     Typically either GaQuery or GaControl objects.
 * @return {gadash.GaComponent} The new GaComponent instance.
 */
gadash.getGaComponent = function(opt_objects) {
  return new gadash.GaComponent().add(opt_objects);
};



/**
 * Creates a new GaComponent object for managing multiple queries.
 * @return {gadash.GaComponent} this object. Useful for chaining methods.
 * @constructor.
 */
gadash.GaComponent = function() {
  this.objects_ = [];
  return this;
};


/**
 * Adds a new GaControl or GaQuery to the dashboard. Can be a single object,
 * or an array of objects.
 * For example, the following are valid:
 *   dash.add(chart1);
 *   dash.add([chart1, chart2, chart3])
 *
 * @param {object|array} object An optional list of gadash.GaQuery or
 *     gadash.Control objects.
 * @return {gadash.GaComponent} this object. Useful for chaining methods.
 */
gadash.GaComponent.prototype.add = function(object) {

  if (gadash.util.getType(object) == 'array') {
    for (var i = 0, obj; obj = object[i]; ++i) {
      this.add(obj);
    }
  } else {

    this.objects_.push(object);
  }
  return this;
};


/**
 * Returns the config object for all objects that support the getConfig
 * method as a single object. Typically thse include either contol or
 * dashboard objects.
 * @return {Object} A single config object for all controls.
 */
gadash.GaComponent.prototype.getConfig = function() {
  var config = {};
  for (var i = 0, object; object = this.objects_[i]; ++i) {
    if (object.getConfig) {
      gadash.util.extend(object.getConfig(), config);
    }
  }
  return config;
};


/**
 * Calls the setConfig method on all the objects in the dashboard that
 * support either the setConfig method. Typically these include either
 * query or dashboard objects.
 * @param {Object} config The configuration object to set on all the
 *     objects.
 * @return {gadash.GaComponent} this object. Useful for chaining methods.
 */
gadash.GaComponent.prototype.setConfig = function(config) {
  for (var i = 0, object; object = this.objects_[i]; ++i) {
    if (object.setConfig) {
      object.setConfig(config);
    }
  }
  return this;
};


/**
 * Executes all the objects that support the execute method.
 * This first gets all the current
 * configuration values from any controls, then overrides them with
 * the opt_config parameter. Finally each object is executed.
 * @param {Object=} opt_config An optional configuration object to set
 *     on all the charts before rendering them.
 * @return {gadash.GaComponent} this object. Useful for chaining methods.
 */
gadash.GaComponent.prototype.execute = function(opt_config) {
  var config = this.getConfig();
  if (opt_config) {
    gadash.util.extend(opt_config, config);
  }
  for (var i = 0, object; object = this.objects_[i]; ++i) {
    if (object.execute) {
      object.execute(config);
    }
  }
  return this;
};

