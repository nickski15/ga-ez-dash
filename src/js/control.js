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
 * Provides the GaControl object. This can be used to simplify getting
 * config data from UI form controls.
 */


// Namespace.
gadash.control = gadash.control || {};



/**
 * Main control object.
 * @param {Object} settings Configuration settings for this control.
 *     Can contain the following key / values:
 *     - id {String} The ID of the element that contains the control.
 *     - configObjKey {String} The dot notation representation of the
 *       configuration object key.
 *     - getValue {Function} A function to return the value of the control.
 * @constructor.
 * @return {gadash.GaControl} this object. Useful for chaining.
 */
gadash.GaControl = function(settings) {
  this.settings = settings;

  /**
   * The main configuration object for this control to return.
   * @type {Object}
   */
  this.configObj;

  /**
   * Reference to the last object in the configuration object. This should
   * be used with this.configLastKey to set the current value of the
   * configuration object.
   * @type {Object}
   */
  this.configLastObj;

  /**
   * The key of the last configuration object.
   * @type {String}
   */
  this.configLastKey;

  var vals = gadash.control.getConfigObjDetails(this.settings['configObjKey']);
  this.configObj = vals['configObj'];
  this.configLastObj = vals['configLastObj'];
  this.configLastKey = vals['configLastKey'];

  return this;
};


/**
 * Returns the current value of this control. The logic is handled by the
 * settings.getValue function.
 * @return {String} The current value of this control.
 */
gadash.GaControl.prototype.getValue = function() {
  var val = this.settings.getValue.apply(this);
  return val;
};


/**
 * Returns an object to be used as a query / chart config object.
 * The keys of the object derived from the dot notation of
 * this.configObj and the value is derived from this.getValue.
 * @return {Object} The configuration object for this control.
 */
gadash.GaControl.prototype.getConfig = function() {
  this.configLastObj[this.configLastKey] = this.getValue();
  return this.configObj;
};


/**
 * Returns a new control object for a text input element.
 * @param {String} id The element ID of the text input.
 * @param {String} configObjKey The config object the value of this element
 *     maps to. This is defined in dot notation.
 * @return {gadash.GaControl} The new control object.
 */
gadash.getTextInputControl = function(id, configObjKey) {
  return new gadash.GaControl({
    'id': id,
    'configObjKey': configObjKey,
    'getValue': gadash.control.getTextInputValue
  });
};


/**
 * Returns the value of the text element specified by this.id.
 * @return {string} The value of the text input element.
 * @this {gadash.GaControl}
 */
gadash.control.getTextInputValue = function() {
  return document.getElementById(this.settings.id).value;
};


/**
 * Creates a new object from the dot notation representation defined
 * in key.
 * For example if key is aaa.bbb.ccc
 *   configObj = {'aaa': {'bbb': {'ccc': {}}}}
 *   configLastObj equals the object referenced by the 'bbb' key.
 *   configLastKey equals the last key 'ccc'
 *   configLastObj[configLastKey] is the value pointed by the 'ccc' key.
 * This can be used to set the value of this key without having to regenerate
 * the entire object.
 * @param {String} dotNotation The key to generate in dot notation.
 * @return {Object} All the parts of the config object.
 */
gadash.control.getConfigObjDetails = function(dotNotation) {
  var configObj = configLastObj = {};

  var keys = dotNotation.split('.');
  for (var i = 0; i < keys.length - 1; ++i) {
    var key = keys[i];
    configLastObj[key] = {};
    configLastObj = configLastObj[key];
  }

  // Save the last key and use it to create the final object.
  // The final object will be overwritten by getValue.
  var configLastKey = keys[keys.length - 1];
  configLastObj[configLastKey] = {};

  return {
    'configObj': configObj,
    'configLastObj': configLastObj,
    'configLastKey': configLastKey
  };
};
