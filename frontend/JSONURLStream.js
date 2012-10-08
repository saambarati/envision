
var util = require('util')
  , Stream = require('stream')
  , DEBUG = true
  , debug = require('./utilities.js').debug


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

  this._url = url
  this.start()
}
util.inherits(JSONURLStream, Stream)

JSONURLStream.prototype.start = function() {
  this._buffers = []
  this._place = 0

  var xhr = new XMLHttpRequest()
  xhr.open('GET', this._url, true) //async
  xhr.addEventListener('progress', this.xhrProgress.bind(this))
  xhr.onreadystatechange = this.stateChange.bind(this)
  xhr.send()
  this._xhr = xhr

  this.paused = true
  process.nextTick(this.resume.bind(this))
  debug('JSONURLStream start() method called')
}

JSONURLStream.prototype.xhrProgress = function(evt) {
  var data = this._xhr.responseText.slice(this._place)
  this._place += data.length
  data = data.split('\n')
  this._buffers = this._buffers.concat(data)
  this._unloadBuffers()
}

JSONURLStream.prototype.stateChange = function() {
  var x = XMLHttpRequest
    , state = this._xhr.readyState

  switch (state) {
    case x.UNSENT :
      debug('readystatechange : UNSENT')
      break
    case x.OPENED :
      debug('readystatechange : OPENED')
      break
    case x.HEADERS_RECEIVED :
      debug('readystatechange : HEADERS_RECEIVED')
      break
    case x.LOADING :
      debug('readystatechange : LOADING')
      break
    case x.DONE :
      debug('readystatechange : DONE')
      this._unloadBuffers() //emit remaining data
      this.start() //reconnect
      break
    default :
      debug('unrecongized readystatechange :' + state)
  }
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
