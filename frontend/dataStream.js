
var Stream = require('stream')
  , util = require('util')
  , http = require('http')
  , jsonURLStream = require('./JSONURLStream.js')


function DataStream(opts) {
  if (!(this instanceof DataStream)) return new DataStream(opts)
  if (!opts) throw new Error('url is required for DataStream to do anything useful')

  if (typeof opts === 'string') {
    opts = {url : opts}
    opts.averagingData = false
    opts.averageDataInterval = Infinity
  }

  Stream.call(this)

  this.writable = false
  this.readable = true
  this.paused = true
  this._url = opts.url
  this._req = null
  this._averagingData = opts.averagingData
  this._averageDataInterval = opts.averageDataInterval
  this._buffers = []
  this._averageDataBuf = []

  var intID
  if (this._averagingData) {
    if (!this._averageDataInterval) throw new Error('to take an average of the incoming data, I need an "averageDataInterval"') 
    intID = setInterval(this._clearAverages.bind(this), this._averageDataInterval)
    this.once('end', function() {
      clearInterval(intID)
    })
  }
  if (opts.__test === undefined) this._begin()  //shim to be able to test w/ node.js runtime
  process.nextTick(this.resume.bind(this))
}
util.inherits(DataStream, Stream)

DataStream.prototype._begin = function() {
  var self = this
  self._req = jsonURLStream(self._url)
  self._req.on('data', function(buf) {
    if (self._averagingData) {
      self._averageDataBuf.push(buf)
    } else {
      self._buffers.push(buf)
      self._emitBuffers()
    }
  })
  self._req.once('end', function() {
    self.emit('end')
  })

 // http.get({path:self._url}, function(res) {
 //   self._res = res
 //   self._res.on('data', function(buf) {
 //     //console.log('typeof buf in "data" event is: ' + typeof buf)
 //     console.log('res data === ' + buf)
 //     self._buffers = self._buffers.concat(buf.split('\n'))
 //     console.log('self._buffers.length === ' + self._buffers.length)
 //     self._emitBuffers()
 //   }) 

 //   self._res.on('end', function() {
 //     self.emit('end')
 //   })
 // })
}

DataStream.prototype.pause = function() { 
  this.paused = true
}

DataStream.prototype.resume = function() {
  this.paused = false
  //console.log('this is now resumed')
  if (!this._averagingData) this._emitBuffers()
}
DataStream.prototype._emitBuffers = function() {
  var buf
  while (this._buffers.length && !this.paused) {
    buf = this._buffers.shift()
    this.emit('data', buf)
    //console.log('emitting buffer ' + buf)
  }
  //console.log('emmitted buffers')
}

function averageOfArray(arr) {
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + arr[i]
  }
  return sum / arr.length
}

DataStream.prototype._clearAverages = function () {
  var profileTypes = {}
    , i
    , curBuf
    , objProps
    , key
    , curValArr
    , average
  for (i = 0; i < this._averageDataBuf.length; i++) {
    curBuf = this._averageDataBuf[i]
    curBuf = JSON.parse(curBuf)
    if (!profileTypes[curBuf.name]) {
      profileTypes[curBuf.name] = []  //hold all values
      profileTypes[curBuf.name]._original = curBuf
    }
    profileTypes[curBuf.name].push(curBuf.val)
  }
  //why isn't forEach supported by IE :(
  objProps = Object.getOwnPropertyNames(profileTypes) 
  for (i = 0; i < objProps.length; i++) {
    curValArr = profileTypes[objProps[i]]
    average = averageOfArray(curValArr)
    curValArr._original.val = average
    this._buffers.push(JSON.stringify(curValArr._original))
  }
  this._averageDataBuf = []
  console.log('cleared interval :: rate=>' + this._averageDataInterval)
  this._emitBuffers() 
}


module.exports = DataStream
exports.DataStream = DataStream


