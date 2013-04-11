ga-ez-dash
==========

A forked version of the Google Analytics Easy Dashboard Library.
I put this here to make it easier to play with the code, make fun demos, and track ideas.

The official source can be found here: http://goo.gl/mYI79

And I'm going to be adding demos on this page: http://nickski15.github.com/ga-ez-dash/



Changelog
---------

### version 2.1.0
- refactored all query objects into a single Query objects
- modified method name:
  - Query.set() is now Query.setConfig()
  - Query.render() is now Query.execute()
- added methods to get various pre configured objects:
  - gadash.getCoreQuery()
  - gadash.getCoreLineChart()
  - gadash.getCoreBarChart()
  - gadash.getCorePieChart()
  - gadash.getCoreColumnChart()
- render method accepts an optional config object
- added a new Dashboard class. This has both setConfig and execute methods,
  to simplify managing multiple query objects as a single object.


### version 2.0.0
- gadash.configKeys renamed to gadash.init
- gadash.init accepts onAuthorized and onUnAuthorized methods to override
  default auth handlers
- config object support onRequest, onResponse, onSuccess, and onError handlers
- added new CoreQuery class; useful to create your own custom visualizations
- added dynamic loaders to all Chart objects
- library moved to /out folder; contains library + minified version
- codebase split into multiple files under /src
- new BUILD file added that also performs lint checks


### version 1.0.1
- new scope added to auth
- logged-in user email address now displayed; new logout button added
- library dependencies now auto load themselves
- added google visualization wrappers
- default of last 28 days added to all Charts


### Version 1.0.0
- initial commit

