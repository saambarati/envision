
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

  Stream.call(this)
  this.readable = false
  this.writable = true

 // this.once('pipe', function(src) {
 // 
 // })
  this._buffers = []
  this._filters = []
}
util.inherits(GraphStream, Stream)

GraphStream.prototype.write = function (buf) {
  buf = JSON.parse(buf)
  if (this._filters.length && this._filters.indexOf(buf.name) !== -1) return //ignore certain buffers

  this.draw(buf)
  console.log('incoming graph data')
}

GraphStream.prototype.end = function (buf) {
  if (buf) this.write(buf)
  this.emit('end')
}
GraphStream.prototype.filter = function() {
  this._filters = this._filters.concat(Array.prototype.slice.apply(arguments))
  return this
}

//exports.GraphStream = GraphStream


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

  GraphStream.call(this)
  if (!opts) opts = {}

  //TODO: if contains %, query width and adjust to pixels
  this.width = opts.width || '800'
  this.height = opts.height || '800'
  this.dataPoints = opts.dataPoints || null
  this.data = null
  this.separator = opts.separator || null

  this.ctx = d3.select(opts.selector || 'body')
    .append('svg')
    .attr('class', opts.className || 'graph')
    .attr('width', this.width)
    .attr('height', this.height)

}
util.inherits(Graph, GraphStream)
Graph.prototype.draw = function () { throw new Error('draw method must be implemented by subclass')} 


/*
 *   separator : bar separator   :: default 1
*/
function BarGraph(opts) {
  if (!(this instanceof BarGraph)) return new BarGraph(opts)

  Graph.call(this, opts)

  this.data = d3.range(this.dataPoints).map(function() { return {val:2, name:'dummy'} }) //dummy data
  this.separator = opts.separator || 1 
  this.transitionTime = opts.transitionTime || 750
  //this.barWidth = (this.width / this.dataPoints) - (this.separator * this.dataPoints)
  function fixBarWidth() { //if separator is too big compared to barWidth
    this.barWidth = (((this.width - ((this.separator-1) * this.dataPoints))) / this.dataPoints)
    if (this.barWidth <= 1) {
      this.separator = Math.floor(this.separator/1.25)
      fixBarWidth.call(this)
    }
  }
  fixBarWidth.call(this) //adjust bar width to not be less than 1 px

  this.ctx.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height - 0.5)
      .attr('y2', this.height - 0.5)
      .style('stroke', '#000')

}
util.inherits(BarGraph, Graph)
exports.BarGraph = BarGraph

BarGraph.prototype.draw = function (val) {
  if (!val) return

  var self = this
    , xScale
    , yScale
    , chart
    , t = self.transitionTime

  self.data.push(val)
  self.data.shift()

  xScale = d3.scale.linear()
             .domain([0, self.data.length])
             .range([0, self.width])
  yScale = d3.scale.linear()
             .domain([d3.min(self.data, function(d) { return d.val - 10 }) , d3.max(self.data, function(d) { return d.val  + 10 })])
             .range([0, self.height])

  function toAll(type) {
     //attributes = ['x', 'y', 'width', 'height']
    switch (type) {
      case 'x' : return function(d, i) { return i*self.barWidth + i*self.separator - 0.5}
      case 'y' : return function (d) { return self.height - yScale(d.val) - 0.5 }
      case 'width' : return function () { return self.barWidth - 0.5 } 
      case 'height' : return function(d) { return yScale(d.val) - 0.5 }  //TODO : look into anti-aliasing prevention
    }
  }

  chart = self.ctx.selectAll('rect')
         .data(self.data)

  chart.enter().append('rect')
       .attr('x', function(d, i) { return toAll('x')(d, i+1)})
       .attr('y', toAll('y'))
       .attr('width', toAll('width'))
       .attr('height', toAll('height'))
     .transition()
       .duration(t)
       .attr('x', function(d, i) { return toAll('x')(d, i)})


  chart.transition()
       .duration(t)
       .attr('x', function(d,i) { return toAll('x')(d, i) })
       .attr('y', toAll('y'))
       .attr('height', toAll('height'))

  chart.exit()
       .transition()
       .duration(t)
       .attr('x', function (d, i) { return xScale(i-1) - 0.5 })
       .remove()



}

function CircleGraph (opts) {
  if (!(this instanceof CircleGraph)) return new CircleGraph(opts)

  Graph.call(this, opts)
  this.data = {}

  //draw axis
  this.ctx.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height - 0.5)
      .attr('y2', this.height - 0.5)
      .style('stroke', '#000')
}
util.inherits(CircleGraph, Graph)
exports.CircleGraph = CircleGraph

CircleGraph.prototype.filter = function() {
  Graph.filter.apply(this, arguments)
  this.dataPoints = this._filters.length
  return this
}

CircleGraph.prototype.draw = function (buf) {
  var self = this
    , d3Data = []
    , chart
    , rScale
    , xScale
    , toAll = {}
    , intervalLength

  //each name will be an array
  if (!this.data[buf.name]) this.data[buf.name] = []
  this.data[buf.name].push(buf.val)

  self.dataPoints = Object.getOwnPropertyNames(self.data).length
  //create new array with averages of values under each buf.name
  Object.getOwnPropertyNames(self.data).forEach(function(key) {
    d3Data.push([averageOfArray(self.data[key]), key])
  })

  //chart.enter().append('circle')
  chart = self.ctx.selectAll('circle')
              .data(d3Data)


  rScale = d3.scale.linear()
             .domain([d3.min(d3Data, function(d) { return d[0] - self.separator }) , d3.max(d3Data, function(d) {  return d[0] + self.separator })])
             .range([0, self.width/self.dataPoints/2])
  intervalLength = self.width/self.dataPoints

  toAll.cx = function (d, i) { return (i+1)*intervalLength - (intervalLength/2) }
  toAll.r = rScale
  toAll.cy = self.width/2 - 0.5
  toAll.text = function (d, i) { return d[1]+'=>'+Math.floor(d[0]) }

  chart.enter().append('circle')
       .attr('cx', toAll.cx)
       .attr('r', function(d) { return toAll.r(d[0]) })
       .attr('cy', toAll.cy)

  chart.transition()
       .duration(1000)
       .attr('r', function(d) { return toAll.r(d[0]) })
       .attr('cx', toAll.cx)

  chart.exit().remove()

  chart = self.ctx.selectAll('text')
              .data(d3Data)
 
  chart.enter().append('text')
       .attr('x', function (d, i) { return intervalLength*i })
       .attr('y', self.height - 30)
       .attr('dy', '1.2em')
       .attr('dx', intervalLength/2)
       .attr('text-anchor', 'middle')
       .attr('fill', 'steelBlue')
       .text(toAll.text)
       //.attr('opacity', 0)
     .transition()
       .duration(1000)
       .attr('x', function (d, i) { return intervalLength * i })
       .attr('dx', intervalLength/2)

  chart.transition()
       .duration(1000)
       .attr('x', function (d, i) { return intervalLength*i })
       .attr('dx', intervalLength/2)
       .text(toAll.text)
       //.attr('opacity', 1)

  chart.exit().remove()
       
  for (var i = 0; i < 4; i++) {
    self.ctx.append('line')
        .attr('x1', (self.width/4) * i)
        .attr('x2', (self.width/4) * i)
        .attr('y1', this.height - 0.5)
        .attr('y2', 0.5)
        .style('stroke', '#000')
  }
       
}



function averageOfArray(arr) {
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + arr[i]
  }
  return sum / arr.length
}


