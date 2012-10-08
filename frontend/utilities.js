
exports.DEBUG = true

if (exports.DEBUG) {
  exports.debug = function() {
    console.log.apply(console, ['DEBUG: '].concat([].slice.call(arguments)))
  }
} else {
  exports.debug = function() {}
}

