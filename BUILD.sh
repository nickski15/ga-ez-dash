# TODO: Modify this to your own path to the closure library.
# You can download the library here: http://code.google.com/p/closure-compiler/
closurePath="/Users/nm/work/js/closure/compiler-latest/compiler.jar"

out_name="gadash-2.0"

# Outputs a concatenated file.
cat \
  src/core.js \
  src/util.js \
  src/gviz.js > "out/$out_name.js"


# Outputs a minified file.
java -jar "$closurePath" \
  --compilation_level SIMPLE_OPTIMIZATIONS \
  --js="src/core.js" \
  --js="src/util.js" \
  --js="src/gviz.js" \
  --js_output_file="out/$out_name-min.js"
