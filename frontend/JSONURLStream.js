
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
  this._maxRetryCount = 30 //retry connection this many times
  this._retryCount = 0
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
  data = data.split('\n').filter(function(buf) {
    return buf.length > 0
  })
  this._buffers = this._buffers.concat(data)
  this._unloadBuffers()
}

JSONURLStream.prototype.stateChange = function() {
  var x = XMLHttpRequest
    , state = this._xhr.readyState
    , self = this

  switch (state) {
    case x.UNSENT :
      debug('readystatechange : UNSENT')
      break
    case x.OPENED :
      debug('readystatechange : OPENED')
      break
    case x.HEADERS_RECEIVED :
      debug('readystatechange : HEADERS_RECEIVED')
      debug('resetting retry count')
      //TODO, should this be here in HEADERS_RECEIVED or under LOADING ?
      self._retryCount = 0
      break
    case x.LOADING :
      debug('readystatechange : LOADING')
      break
    case x.DONE :
      debug('readystatechange : DONE')
      debug('statusCode for url called: ' + this._xhr.status)
      this._unloadBuffers() //emit remaining data
      //retry connection after 1 second
      setTimeout(function() {
        if (self._retryCount < self._maxRetryCount){
          self._retryCount += 1
          debug('retry count :' + self._retryCount)
          self.start() //try to reconnect
        } else {
          debug('max retry limit reached')
        }
      }, 1000)
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
    this.emit('data', this._buffers.shift())
  }
}

module.exports = JSONURLStream
exports.JSONURLStream = JSONURLStream
