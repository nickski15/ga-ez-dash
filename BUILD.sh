# Simple BUILD file for ga-ez-dash (tested only on linux/osx)
#
# The script will first run the closure linter on all JavaScript files in /src
# If any lint errors occur, they will be printed and execution will stop.
#
# If code passes, the script will generate 2 files:
#   out/ga-dash-2.0.js - a conatenated version of all the JS files in /src
#   out/ga-dash-2.0-min.js - a minified version of all the JS files in /src
#
# To run this you must install:
#   closure linter: http://code.google.com/p/closure-linter/
#   closure compiler app: http://code.google.com/p/closure-compiler/ 
#
# Once the compiler is installed, modify this variable to
# point to the compiler jar.
closurePath="/Users/nm/work/closure/compiler.jar"


# Name of the output file.
out_name="gadash-2.0"

# Run the gjslinter on all src files.
gjslint -r src --strict --unix_mode

# If errors occur, exit and do not compile anything.
if [ $? -ne 0 ]; then
  echo -e "
JavaScript in /src folder must adhere to the following style guide:
http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml

fix to continue...\n"
  exit 1
fi
echo 'Building...'

# Outputs a concatenated file.
cat \
  src/js/auth.js \
  src/js/control.js \
  src/js/util.js \
  src/js/query.js \
  src/js/core.js \
  src/js/gviz.js \
  src/js/ui.profile-select.js \
  src/js/component.js > "out/$out_name.js"


# Outputs a minified file.
java -jar "$closurePath" \
  --compilation_level SIMPLE_OPTIMIZATIONS \
  --js="src/js/auth.js" \
  --js="src/js/control.js" \
  --js="src/js/util.js" \
  --js="src/js/query.js" \
  --js="src/js/core.js" \
  --js="src/js/gviz.js" \
  --js="src/js/ui.profile-select.js" \
  --js="src/js/component.js" \
  --js_output_file="out/$out_name-min.js"

