//file that will be compiled by browserify

module.exports = {
  graph : require('./frontend/graphStream').graph
  , dataStream : require('./frontend/dataStream')
  , _util : require('util')
}

if (window) {
  window.envision = module.exports
  window.d3 = require('d3')
}
