
var util = require('util')
  , Stream = require('stream')

//TODO :
//  consider using web sockets
//  consider stopping and restarting web connection when memory consumption becomes too big
//  build in error handling and restart connection when an error occures
function JSONURLStream(url) {
  if (!(this instanceof JSONURLStream)) return new JSONURLStream(url)
  if (!url) throw new Error('url required')

  Stream.call(this)
  this.readable = true
  this.writable = false
  this.paused = true

  this._buffers = []
  this._place = 0

  this._xhr = new XMLHttpRequest()
  this._xhr.open('GET', url, true)
  this._xhr.send()
  this._xhr.addEventListener('progress', this.xhrProgress.bind(this))

  process.nextTick(this.resume.bind(this)) 
}
util.inherits(JSONURLStream, Stream)

JSONURLStream.prototype.xhrProgress = function(evt) {
  var data = this._xhr.responseText.slice(this._place)
  this._place += data.length
  data = data.split('\n')
  this._buffers = this._buffers.concat(data)
  this._unloadBuffers()
}

JSONURLStream.prototype.pause = function() {
  this.paused = true
}
JSONURLStream.prototype.resume = function() {
  this.paused = false
  this._unloadBuffers()
}
JSONURLStream.prototype._unloadBuffers = function() {
  var buf 
  while (this._buffers.length && !this.paused) {
    buf = this._buffers.shift()
    if (buf.length) this.emit('data', buf)
  }
}

module.exports = JSONURLStream
exports.JSONURLStream = JSONURLStream
