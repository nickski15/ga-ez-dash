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
 * This file provides logic to transform the data returned from the
 * Core Reporting API into Google Visualization Charts. It also provides
 * the following chart generation methods:
 *   gadash.getCoreChart();
 *   gadash.getCoreLineChart();
 *   gadash.getCorePieChart();
 *   gadash.getCoreBarChart();
 *   gadash.getCoreColumnChart();
 * .
 */


/**
 * Namespace.
 * @type {Object}
 */
gadash.gviz = gadash.gviz || {};


/**
 * Adds a loading message to the div in which the chart is executed.
 * Then queries the Core Reporting API.
 * @this {gadash.GaQuery} The base GaQuery object.
 */
gadash.gviz.onRequestDefault = function() {
  gadash.util.getElement(this.config.elementId).innerHTML = [
    '<div class="ga-loader" ',
    'style="color:#777;font-size:18px;overflow:hidden">',
    '<img style="display:block;float:left" src="',
    gadash.util.getLoaderUri(), '">',
    '<div style="margin:6px 0 0 12px;float:left">Loading...</div></p>'
  ].join('');
  gadash.util.bindMethod(this, gadash.core.onRequestDefault)();
};


/**
 * Removes all content from the div in which the chart is executed.
 * @this {gadash.GaQuery} The base GaQuery object.
 */
gadash.gviz.onResponseDefault = function() {
  gadash.util.getElement(this.config.elementId).innerHTML = '';
};


/**
 * Default callback for creating Google Charts with a response. First, the
 * response is put into a DataTable object Second, the corresponding chart
 * is returned. The two are then combined to draw a query that is populated
 * with the GA data.
 * @param {Object} response A Google Analytics API JSON response.
 * @this {gadash.GaQuery} The base GaQuery object.
 */
gadash.gviz.onSuccessDefault = function(response) {
  var dataTable = gadash.gviz.getDataTable(response, this.config.type);
  var chart = gadash.gviz.getChart(this.config.elementId, this.config.type);
  gadash.gviz.draw(chart, dataTable, this.config.chartOptions);
};


/**
 * Creates a DataTable object using a GA response.
 * @param {Object} resp A Google Analytics response.
 * @param {String=} opt_chartType The chart type. Provides a hint on
 *     how to parse the API results into a data table.
 * @return {Object} data A Google DataTable object populated
 *     with the GA response data.
 * @this references the Chart object.
 */
gadash.gviz.getDataTable = function(resp, opt_chartType) {

  var chartType = opt_chartType || false;

  var data = new google.visualization.DataTable();
  var numOfColumns = resp.columnHeaders.length;
  var numOfRows;

  // Throw an error if there are no rows returned.
  if (resp.rows && resp.rows.length) {
    numOfRows = resp.rows.length;
  } else {
    gadash.util.displayError('No rows returned for that query.');
  }

  /*
   * Looks at the resp column headers to set names and types for each column.
   * Since bar and column chart don't support date object, set type as string
   * rather than a Date.
   */
  for (var i = 0; i < numOfColumns; i++) {
    var dataType = resp.columnHeaders[i].dataType;
    var name = resp.columnHeaders[i].name;

    if (name == 'ga:date' &&
        !(chartType == 'ColumnChart' || chartType == 'BarChart')) {

      dataType = 'date';
    } else if (dataType == 'STRING') {
      dataType = 'string';
    } else {
      dataType = 'number';
    }
    data.addColumn(dataType, gadash.util.formatGAString(name));
  }

  /*
   * Populates the rows by using the resp.rows array. If the type
   * is an int then parse the INT. If it is a percent, then round
   * to last two decimal places and store as INT.
   */
  for (var i = 0; i < numOfRows; i++) {
    var arrayMetrics = [];
    for (var j = 0; j < numOfColumns; j++) {
      var name = resp.columnHeaders[j].name;
      var dataType = resp.columnHeaders[j].dataType;

      if (name == 'ga:date' &&
          !(chartType == 'ColumnChart' || chartType == 'BarChart')) {

        arrayMetrics.push(gadash.util.stringToDate(resp.rows[i][j]));
      } else if (dataType == 'INTEGER') {
        arrayMetrics.push(parseInt(resp.rows[i][j]));
      } else if (dataType == 'CURRENCY') {
        arrayMetrics.push(parseFloat(resp.rows[i][j]));
      } else if (dataType == 'PERCENT' || dataType == 'TIME' ||
          dataType == 'FLOAT') {
        arrayMetrics.push(Math.round((resp.rows[i][j]) * 100) / 100);
      } else {
        arrayMetrics.push(resp.rows[i][j]);
      }
    }
    data.addRow(arrayMetrics);
  }

  /*
   * Iterates through each column in the data table and formats
   * any column that has a CURRENCY datatype to two decimal places
   * and a '$' before the amount.
   */
  for (var i = 0; i < numOfColumns; i++) {
    var dataType = resp.columnHeaders[i].dataType;
    if (dataType == 'CURRENCY') {
      var formatter = new google.visualization.NumberFormat(
          {fractionDigits: 2});
      formatter.format(data, i);
    }
  }

  return data;
};


/**
 * Checks to see if the type of chart in the config is valid.
 * If it is, get its chart instance, else return a Table instance.
 * @param {String} id The ID of the HTML element in which to execute
 *     the chart.
 * @param {String} chartType The type of the Chart to execute.
 * @return {Object} visualization - returns the Chart instance.
 */
gadash.gviz.getChart = function(id, chartType) {
  var elem = gadash.util.getElement(id);

  if (google.visualization[chartType]) {
    return new google.visualization[chartType](elem);
  }

  return new google.visualization.Table(elem);
};


/**
 * Draws a chart to its declared div using a DataTable.
 * @param {Object} chart - The Chart instance you wish to draw the data into.
 * @param {Object} dataTable - The Google DataTable object holding
 *     the response data.
 * @param {Object} chartOptions - The optional configuration parameters to pass
 *     into the chart.
 */
gadash.gviz.draw = function(chart, dataTable, chartOptions) {

  // TODO(nm): Re-evaluate why we do this here.
  gadash.util.convertDateFormat(dataTable);
  gadash.gviz.createDateFormater(dataTable);
  chart.draw(dataTable, chartOptions);
};


/**
 * Creates a date format 'MMM d', which can be called by chart wrappers
 * @param {Object} dataTable - The Google DataTable object holding
 *     the response data.
 */
gadash.gviz.createDateFormater = function(dataTable) {
  var dateFormatter = new google.visualization.DateFormat({pattern: 'MMM d'});
  dateFormatter.format(dataTable, 0);
};


/**
 * The standard controller configuration for Core Reporting Charts.
 * This should be passed to the constructor of all GaQuery objects
 * for gviz Core Reporting API Charts.
 * @type {Object}
 */
gadash.gviz.coreChartConfig = {
  'onRequestDefault': gadash.gviz.onRequestDefault,
  'onResponseDefault': gadash.gviz.onResponseDefault,
  'onSuccessDefault': gadash.gviz.onSuccessDefault,
  'onErrorDefault': gadash.onErrorDefault
};


/**
 * Base Chart for the Core Reporting API.
 * @param {opt_config=} opt_config An optional configuration object.
 * @return {gadash.GaQuery} The newly created GaQuery object.
 */
gadash.getCoreChart = function(opt_config) {
  return new gadash.GaQuery()
      .setConfig(gadash.gviz.coreChartConfig)
      .setConfig(opt_config);
};


/**
 * Line Chart Wrapper. Creates a GaQuery object and sets default settings
 * specific to line charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'lastNdays': 28
 * @param {...Object} var_args The following arguments can be passed in order:
 *     elementId, metrics, ids, config. The config object can be passed as
 *     any of the parameters where any parameters that follow are ignored.
 * @return {gadash.GaQuery} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreLineChart = function(var_args) {
  // Supported arguments order: div, metrics, ids, config
  var argsObj = gadash.gviz.getCommonConfigFromArgs(arguments);

  return new gadash.GaQuery(gadash.gviz.coreChartConfig)
  .setConfig(argsObj.baseConfig)
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.areaChart)
  .setConfig(argsObj.userConfig);
};


/**
 * Pie Chart Wrapper. Creates a GaQuery object and sets default settings
 * specific to pie charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the start time / date range: 'lastNdays': 28.
 * @param {...Object} var_args The following arguments can be passed in order:
 *     elementId, metrics, ids, config. The config object can be passed as
 *     any of the parameters where any parameters that follow are ignored.
 * @return {gadash.GaQuery} this Returns a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCorePieChart = function(var_args) {
  // Supported argumentsorder : div, metrics, dimensions, ids, config
  var baseConfig = {
    'elementId': '',
    'query': {
      'ids': '',
      'metrics': '',
      'sort': '',
      'dimensions': '',
      'maxResults': 5
    }
  };

  var argSetters = [
    function(obj, arg) {obj.elementId = arg},
    function(obj, arg) {
      obj.query.metrics = arg;
      obj.query.sort = '-' + arg;
    },
    function(obj, arg) {obj.query.dimensions = arg},
    function(obj, arg) {obj.query.ids = arg}
  ];

  var argsObj = gadash.gviz.getConfigFromArgs(baseConfig, argSetters,
      arguments);


  return new gadash.GaQuery(gadash.gviz.coreChartConfig)
  .setConfig(argsObj.baseConfig)
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.pieChart)
  .setConfig(argsObj.userConfig);
};


/**
 * Bar Chart Wrapper. Creates a GaQuery object and sets default settings
 * specific to line charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'lastNdays': 28.
 * @param {...Object} var_args The following arguments can be passed in order:
 *     elementId, metrics, ids, config. The config object can be passed as
 *     any of the parameters where any parameters that follow are ignored.
 * @return {gadash.GaQuery} a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreBarChart = function(var_args) {
  // Supported arguments order: div, metrics, ids, config
  var argsObj = gadash.gviz.getCommonConfigFromArgs(arguments);

  return new gadash.GaQuery(gadash.gviz.coreChartConfig)
  .setConfig(argsObj.baseConfig)
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.barChart)
  .setConfig(argsObj.userConfig);
};


/**
 * Bar Column Wrapper. Creates a GaQuery object and sets default settings
 * specific to bar charts.
 * An optional configuration object is passed as a paramter and can override
 * or supplement properties of the configuration object.
 * Following default values are used for this object:
 *     for the dimensions: 'ga:date',
 *     for the start time / date range: 'lastNdays': 28.
 * @param {...Object} var_args The following arguments can be passed in order:
 *     elementId, metrics, ids, config. The config object can be passed as
 *     any of the parameters where any parameters that follow are ignored.
 * @return {gadash.GaQuery} a reference to the newly instantiated
 *     instance. Useful for chaining methods together.
 */
gadash.getCoreColumnChart = function(var_args) {
  // Supported arguments order: div, metrics, ids, config
  var argsObj = gadash.gviz.getCommonConfigFromArgs(arguments);

  return new gadash.GaQuery(gadash.gviz.coreChartConfig)
  .setConfig(argsObj.baseConfig)
  .setConfig(gadash.gviz.defaultGvizChartOptions)
  .setConfig(gadash.gviz.columnChart)
  .setConfig(argsObj.userConfig);
};


/**
 * Utility method to handle variable arguments on builder objects.
 * @param {Object} baseConfig The default config object to which to
 *     set various arguments.
 * @param {Array.<Function>} argSetters The order of the arguments that
 *     should be set. Each are specified as a function to update the
 *     baseConfig object.
 * @param {Array.<Object>} args The arguments array.
 * @return {Object} Two configuration objects, the updated baseConfig
 *     and any user supplied config object.
 */
gadash.gviz.getConfigFromArgs = function(baseConfig, argSetters, args) {
  var userConfig;
  for (var i = 0; i < args.length; ++i) {
    var arg = args[i];
    if (gadash.util.getType(arg) == 'object') {
      // Do not allow additional parameters to be configured.
      userConfig = arg;
      break;

    } else if (i < argSetters.length) {
      // Pass object to be updated with the current argument to the function
      // that handles updating.
      argSetters[i](baseConfig, arg);
    }
  }

  return {
    'baseConfig': baseConfig,
    'userConfig': userConfig
  };
};


/**
 * Utility helper method for certain var_args paramaters
 * This extracts the elementId, metrics, ids, config
 * parameters from variable arguments. This exact sample pattern occurs on
 * a couple of builders so it's abstracted here for simplicity. See
 * getPieChart() for an example of how this works in a builder.
 * @param {Array.<Object>} args The arguments passed to the var_args call.
 * @return {Object} Two configuration objects, the updated baseConfig
 *     and any user supplied config object.
 */
gadash.gviz.getCommonConfigFromArgs = function(args) {
  var baseConfig = {
    'elementId': '',
    'query': {
      'ids': '',
      'metrics': '',
      'dimensions': 'ga:date'
    }
  };

  var argSetters = [
    function(obj, arg) {obj.elementId = arg},
    function(obj, arg) {obj.query.metrics = arg},
    function(obj, arg) {obj.query.ids = arg}
  ];

  return gadash.gviz.getConfigFromArgs(baseConfig, argSetters, args);
};


/**
 * Object containing default value for the chartOptions object.
 * This object is used by all chart wrappers.
 */
gadash.gviz.defaultGvizChartOptions = {
  'chartOptions': {
    height: 300,
    width: 450,
    fontSize: 12,
    curveType: 'function',
    chartArea: {'width': '100%'},
    titleTextStyle: {
      fontName: 'Arial',
      fontSize: 15,
      bold: false
    }
  }
};


/**
 * Object containing default value for the Line chart wrapper.
 */
gadash.gviz.lineChart = {
  'type': 'LineChart',
  'chartOptions': {
    pointSize: 6,
    lineWidth: 4,
    areaOpacity: 0.1,
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7', '#d14836'],
    hAxis: {
      format: 'MMM d',
      gridlines: {color: 'transparent'},
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        logScale: 'true',
        count: 3
      },
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Area chart wrapper.
 */
gadash.gviz.areaChart = {
  'type': 'AreaChart',
  'chartOptions': {
    pointSize: 6,
    lineWidth: 4,
    areaOpacity: 0.1,
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7'],
    hAxis: {
      format: 'MMM d',
      gridlines: {
        count: 3,
        color: 'transparent'
      },
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        logScale: 'true',
        count: 3
      },
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Pie chart wrapper.
 */
gadash.gviz.pieChart = {
  'type': 'PieChart',
  'chartOptions': {
    legend: {
      position: 'right',
      textStyle: {
        bold: 'true',
        fontSize: 13
      },
      alignment: 'center',
      pieSliceText: 'none'
    }
  }
};


/**
 * Object containing default value for the bar chart wrapper.
 */
gadash.gviz.barChart = {
  'type': 'BarChart',
  'chartOptions': {
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7', '#d14836'],
    hAxis: {
      gridlines: {
        count: 3,
        color: '#efefef'
      },
      minValue: 0,
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: 'transparent'
      },
      count: 3,
      textPosition: 'in'
    }
  }
};


/**
 * Object containing default value for the Column chart wrapper.
 */
gadash.gviz.columnChart = {
  'type': 'ColumnChart',
  'chartOptions': {
    legend: {
      position: 'top',
      alignment: 'start'
    },
    colors: ['#058dc7', '#d14836'],
    hAxis: {
      gridlines: {
        count: 3,
        color: 'transparent'
      },
      baselineColor: 'transparent'
    },
    vAxis: {
      gridlines: {
        color: '#efefef',
        count: 3
      },
      minValue: 0,
      textPosition: 'in'
    },
    chartArea: {'width': '90%'}
  }
};

