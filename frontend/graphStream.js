
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true,  */

var Stream = require('stream')
  , util = require('util')


/*
 * High level overview of classes:
 *
 * GraphStream is a writable stream that takes incoming JSON buffers and parses through them
 * GraphStream calls the method `draw` when its own `write` method is called. `draw` is meant to be implemented by its subclasses
 * 
 * Graph is a subclass of GraphStream and it is also meant to be subclassed. 
 * Graph just provides a unified interface for some basic attributes that all Graphs are expected to have such as {width, height, DOM selector, etc}
*/

//opts are passed down to Graph object
function GraphStream(opts) {
  if (!(this instanceof GraphStream)) return new GraphStream(opts)
  if (!opts.height || !opts.width) throw new Error('need height and width to initialize graph')
  //stream stuff
  Stream.call(this)
  this.readable = false
  this.writable = true
  //parsing/buffering stream
  this._buffers = []
  this._filters = []
  //display info
  this.data = {}
  this.drawingQueue = []
  this.initOpts = opts

  //TODO: if contains %, query width and adjust to pixels
  this.ctx = d3.select(opts.selector || 'body')
      .append('svg')
      .attr('class', opts.className || 'graph')
      .attr('width', opts.width)
      .attr('height', opts.height)
}
util.inherits(GraphStream, Stream)
exports.graph = function (opts) {
  return new GraphStream(opts)
}

GraphStream.prototype.write = function (buf) {
  buf = JSON.parse(buf)
  if (this._filters.length && this._filters.indexOf(buf.name) === -1) return //ignore non-filtered datapoints

  this.drawRoutine(buf)
}

GraphStream.prototype.end = function (buf) {
  if (buf) this.write(buf)
  this.emit('end')
}

GraphStream.prototype.filter = function() {
  this._filters = this._filters.concat(Array.prototype.slice.apply(arguments))
  return this
}

GraphStream.prototype.drawRoutine = function(buf) {
  if (!buf) return

  if (!this.data[buf.name]) this.data[buf.name] = []
  this.data[buf.name].push(buf)
  //console.log('incoming graph data  ' + JSON.stringify(buf))
  var graph
  for (var i = 0; i < this.drawingQueue.length; i++) {
    graph = this.drawingQueue[i]
    if (!graph._filters.length || graph._filters.indexOf(buf.name) !== -1) {
      graph.display(this.ctx, this.data)
      if (graph.text) graph.displayText(this.ctx, this.data)
    }
  }
}
var graphTypeMap = {
  'bar' : BarGraph
  , 'circle' : CircleGraph
}

GraphStream.prototype.draw = function(type, opts) {
  var GraphType = graphTypeMap[type] //cunstructor
    , graph
  if (!GraphType) throw new Error('there is no graph type '+type)
  if (!opts) opts = {}
  var initOpts = shallowCopy(this.initOpts) 
  appendPropertiesFrom.call(initOpts, opts)  //override properties in initOpts from opts
  graph = new GraphType(initOpts)
  this.drawingQueue.push(graph)

  return graph
}

exports.GraphStream = GraphStream


/*
 * opts  =>
 *   width      : svg context width :: default 800
 *   height     : svg context height :: default 800 
 *   selector   : #div, html el :: <body> default
 *   className  : .class for css :: 'graph' default
 *   dataPoints : number of dataPoints expected in the graph :: default 15
*/

function Graph (opts) {
  if (!(this instanceof Graph)) return new Graph(opts)

  if (!opts) opts = {}

  this.width = opts.width || '800'
  this.height = opts.height || '800'
  this.dataPoints = opts.dataPoints || 0
  this.separator = opts.separator || 0
  this.transitionTime = opts.transitionTime || 750

  this._filters = []
}

Graph.prototype.attr = function(name, val) {
  this[name] = val
  return this
}

Graph.prototype.unpackData = function (data) { return data } //method to be overwritten by subclasses


/*
 *   separator : bar separator   :: default 1
*/
function BarGraph(opts) {
  if (!(this instanceof BarGraph)) return new BarGraph(opts)

  Graph.call(this, opts)

  //this.data = d3.range(this.dataPoints).map(function() { return {val:0, name:'dummy'} }) //dummy data
  this.separator = opts.separator || 1 

  //this.barWidth = (this.width / this.dataPoints) - (this.separator * this.dataPoints)
  function fixBarWidth() { //if separator is too big compared to barWidth
    this.barWidth = ((this.width - (this.separator * this.dataPoints)) / this.dataPoints)
    if (this.barWidth < 1) {
      this.separator = Math.floor(this.separator/1.25)
      fixBarWidth.call(this)
    }
  }

  fixBarWidth.call(this) //adjust bar width to not be less than 1 px

}
util.inherits(BarGraph, Graph)

BarGraph.prototype.unpackData = function(data) {
  data =  data[ Object.getOwnPropertyNames(data)[0] ]  // only one graph 'name' at a time
  data = data.slice( -this.dataPoints )
  return data
}

BarGraph.prototype.display = function(ctx, data) {

  var self = this
    , xScale
    , yScale
    , chart
    , t = self.transitionTime
    , toAll
    , min
    , max

  data = self.unpackData(data)
  min = d3.min(data, function(d) { return d.val }) 
  max = d3.max(data, function(d) { return d.val })
  xScale = d3.scale.linear()
             .domain([0, data.length])
             .range([0, self.width])
  yScale = d3.scale.linear()
             .domain([min-5, max+5])
             .range([0, self.height])

  toAll = {
    'x' : function(d, i) { return i*self.barWidth + i*self.separator - 0.5}
    , 'y' : function (d) { return self.height - yScale(d.val) - 0.5 }
    , 'width' : function () { return self.barWidth - 0.5 } 
    , 'height' : function(d) { return yScale(d.val) - 0.5 }  //TODO : look into anti-aliasing prevention
  }

  chart = ctx.selectAll('rect')
             .data(data)

  chart.enter().append('rect')
       .attr('x', function(d, i) { return toAll.x(d, i+1)})
       .attr('y', toAll.y)
       .attr('width', toAll.width)
       .attr('height', toAll.height)
     .transition()
       .duration(t)
       .attr('x', function(d, i) { return toAll.x(d, i)})


  chart.transition()
       .duration(t)
       .attr('x', function(d,i) { return toAll.x(d, i) })
       .attr('y', toAll.y)
       .attr('height', toAll.height)

  chart.exit()
       .transition()
       .duration(t)
       .attr('x', function (d, i) { return xScale(i-1) - 0.5 })
       .remove()

}

BarGraph.prototype.displayText = function (ctx, data) {
  data = this.unpackData(data)
  var self = this
    , textOpts 
  textOpts = {
    height : self.height
    , width : self.width
    , transitionTime : self.transitionTime
    , intervalLength : self.barWidth + self.separator
    , text : function (d) { return '' + Math.floor(d.val) }
    , fill : 'red'
  }

  drawText(ctx, textOpts, data)
}



function CircleGraph (opts) {
  if (!(this instanceof CircleGraph)) return new CircleGraph(opts)

  Graph.call(this, opts)
}
util.inherits(CircleGraph, Graph)

CircleGraph.prototype.unpackData = function (data) {
  var d3Data = []
  Object.getOwnPropertyNames(data).forEach(function(key) {
    d3Data.push(averageOfArray(data[key], function(d) { return d.val }))
  })
  return d3Data
}

CircleGraph.prototype.display = function (ctx, data) {
  var self = this
   , d3Data
    , chart
    , rScale
    , xScale
    , toAll = {}
    , intervalLength
    , t = self.transitionTime
    , min
    , max


  self.dataPoints = Object.getOwnPropertyNames(data).length
  //create new array with averages of values under each buf.name
  d3Data = this.unpackData(data)

  chart = ctx.selectAll('circle')
             .data(d3Data)

  min = d3.min(d3Data, function(d) { return d - self.separator }) 
  max = d3.max(d3Data, function(d) {  return d + self.separator })  
       
  rScale = d3.scale.linear()
             .domain([min - 5, max + 5])
             .range([2, Math.min(self.width/self.dataPoints/2, self.height/2.5)])
  intervalLength = self.width/self.dataPoints

  toAll.cx = function (d, i) { return (i+1)*intervalLength - (intervalLength/2) }
  toAll.r = rScale
  toAll.cy = self.height/2 - 0.5

  chart.enter().append('circle')
       .attr('cx', toAll.cx)
       .attr('r', function(d) { return toAll.r(d) })
       .attr('cy', toAll.cy)

  chart.transition()
       .duration(t)
       .attr('r', function(d) { return toAll.r(d) })
       .attr('cx', toAll.cx)
       .attr('cy', toAll.cy)

  chart.exit().remove()

}

CircleGraph.prototype.displayText = function (ctx, data) {
  data = this.unpackData(data)
  var self = this
    , textOpts 
  textOpts = {
    height : self.height
    , width : self.width
    , transitionTime : self.transitionTime
    , text : function (d) { return '' + Math.floor(d) }
    , fill : 'gray'
  }

  drawText(ctx, textOpts, data)
}

function drawText(ctx, opts, data) {
  if (!opts.height || !opts.width) throw new Error('need height and width')

  var chart
    , intervalLength = opts.intervalLength || (opts.width / data.length)
    , t = opts.transitionTime || 1000

  opts.text = opts.text || String

  chart =  ctx.selectAll('text')
              .data(data)
 
  chart.enter().append('text')
       .attr('x', opts.x || function (d, i) { return intervalLength*i })
       .attr('y', opts.y || (opts.height - 28))
       .attr('dy', opts.dy || '1.2em')
       .attr('dx', opts.dx || (intervalLength/2))
       .attr('text-anchor', opts['text-anchor'] || 'middle')
       .attr('fill', opts.fill || 'steelBlue')
       .text(opts.text)
     .transition()
       .duration(t)
       .attr('x', opts.x || function (d, i) { return intervalLength * i })
       .attr('dx', opts.dx || intervalLength/2)
       .text(opts.text)

  chart.transition()
       .duration(t)
       .attr('x', opts.x || function (d, i) { return intervalLength*i })
       .attr('dx', opts.dx || intervalLength/2)
       .text(opts.text)

  chart.exit().remove()
}


/*
 * utilities
*/

function averageOfArray (arr, func) {
  if (!func) func = function(d) { return d }
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + func(arr[i])
  }
  return sum / arr.length
}

//function must be called with 'this' mapped to the object you want altered
//already exisiting keys will be overridden
function appendPropertiesFrom(obj) {
  var keys = Object.getOwnPropertyNames(obj)
    , key
    , i
  for (i = 0; i < keys.length; i++) {
    key = keys[i]
    this[key] = obj[key]  
  }
}

//copy 1 layer deep in the object
function shallowCopy(obj) {
  var ret = {}
    , keys = Object.getOwnPropertyNames(obj)
    , key
    , i
  for (i = 0; i < keys.length; i++) {
    key = keys[i]
    ret[key] = obj[key]
  }

  return ret
}


