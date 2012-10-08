//file that will be compiled by browserify

module.exports = {
  graphStream : require('./graphStream.js')
  , graph : require('./graphStream.js').graph
  , dataStream : require('./dataStream.js')
  , _util : require('util')
}

if (window) {
  window.envision = module.exports
  window.d3 = require('d3')
}
