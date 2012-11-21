//file that will be compiled by browserify

module.exports = {
  graphStream : require('./frontend/graphStream') //TODO, should I call this graphStream, or graphContext?
  , dataStream : require('./frontend/dataStream')
}

if (window) {
  window.envision = module.exports
  window.d3 = require('d3')
}
