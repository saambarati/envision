//file that will be compiled by browserify

module.exports = {
  graphStream : require('./graphStream.js')
  , dataStream : require('./dataStream.js')
  , _util : require('util')
}

if (window) window.envisage = module.exports
