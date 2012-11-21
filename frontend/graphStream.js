
/*global console:true, document:true, window:true, d3:true, XMLHttpRequest:true,  */

var Stream = require('stream')
  , util = require('util')
  , _u = require('./utilities')


/**
 * High level overview of classes:
 *
 * GraphStream is a writable stream that takes incoming JSON buffers and parses through them
 * GraphStream contains references to subclasses of the Graph class which is the class responsible for displaying data fed to it by GraphStream
 *
 * GraphStream's graph method returns subclasses of graph
 *
 * exports.graph is a function that returns a GraphStream object
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
  this.drawingQueue = {} //items needs to be drawn
  this._opts = opts

  var defaults = {
    selector : 'body'
    , class : 'graph'
  }
  _u.copyDefaults(defaults, opts)

  //TODO: if contains %, query width and adjust to pixels
  this.ctx = d3.select(opts.selector)
      .append('svg:svg')
      .attr('class', opts.class)
      .attr('width', opts.width)
      .attr('height', opts.height)

  this._opts = opts
}
util.inherits(GraphStream, Stream)

module.exports = function (opts) {
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

/**
 *
 * buffer format (see http://github.com/saambarati/profiles  the format is taken from those \n delimited json) =>
 * {
 *   name : ...
 *   val : ...
 *   __profileType : ...
 * }
 *
 * this.data format =>
 * {
 *   buffer.name_1 : [array]
 *   buffer.name_2 : [array]
 *   ...
 *   buffer.name_last : [array]
 * }
 * basically for each incoming buffer, its buffer.name attribute represents a new array in our data hash
 * everytime a buffer with that name is written to us, we push it on to the end of that buffer.name's array
 *
 */
GraphStream.prototype.drawRoutine = function(buf) {
  if (!buf) return

  if (!this.data[buf.name]) this.data[buf.name] = []
  this.data[buf.name].push(buf)
  //console.log('incoming graph data  ' + JSON.stringify(buf))
  var graph
    , i
    , keys = Object.getOwnPropertyNames(this.drawingQueue)
    , prop
  for (i = 0; i < keys.length; i++) {
    prop = keys[i]
    graph = this.drawingQueue[prop]
    graph.display(this.ctx, this.data)
    if (graph.text.display) graph.displayText(this.ctx, this.data)
  }
}


//constructors
var graphConstructors = {
  'bar' : BarGraph
  , 'circle' : CircleGraph
  , 'frequency' : FrequencyGraph
}

GraphStream.prototype.graph = function(type, opts) {
  type = type.toLowerCase()
  var GraphType = graphConstructors[type] //cunstructor
    , graph
  if (!GraphType) throw new Error('there is no graph type ' + type)
  opts = opts || {}
  _u.copyDefaults(this._opts, opts)  //override properties in _opts from opts
  graph = new GraphType(opts)
  this.drawingQueue[type] = graph

  return graph
}

GraphStream.prototype.getGraph = function(key) {
  return this.drawingQueue[key]
}



/**
 * opts  =>
 *   width      : svg context width :: default 800
 *   height     : svg context height :: default 800
 *   selector   : #div, html el :: <body> default
 *   className  : .class for css :: 'graph' default
 *   dataPoints : number of dataPoints expected in the graph :: default 15
*/

function Graph (opts) {
  if (!(this instanceof Graph)) return new Graph(opts)

  var optDefaults = {
    width : '800'
    , height : '800'
    , dataPoints : 0
    , separator : 0
    , text : {
       display : true
       , color : 'black'
    }
    , style : {
       fill : 'gray'
       , stroke : 'black'
    }
    , transition : {
       style : {}
       , ease : function (x) { return x }
       , duration : 750
    }
  }
  , self = this

  opts = opts || {}
  //TODO, copyDefaults is shallow, make it a deep copy of objects
  _u.copyDefaults(optDefaults, opts)   //append default options to defaults
  _u.appendPropertiesFrom(opts, this)  //append all of opts's properties to 'this'
}

Graph.prototype.attr = function(name, val) {
  debugger
  _u.nestedProperty(this, name, val) //assign property to value. this can be nested, i.e: this.text.color
  _u.debug('this.' + name + ' = ' + val)
  return this
}

Graph.prototype.title = function(title) {
  _u.debug('this.selector (in Graph.prototype.title) => ' + this.selector)
  var h1 = d3.select(this.selector).insert('h1', ':first-child')
  h1.text(title)
  return this
}

Graph.prototype.unpackData = function (data) { return data } //method to be overwritten by subclasses

/**
 *   separator : bar separator   :: default 1
*/
function BarGraph(opts) {
  if (!(this instanceof BarGraph)) return new BarGraph(opts)
  Graph.call(this, opts)
  this.separator = opts.separator || 2
}
util.inherits(BarGraph, Graph)

BarGraph.prototype.unpackData = function(data) {
  data =  data[ Object.getOwnPropertyNames(data)[0] ]  // only one graph 'name' at a time
  data = data.slice( -this.dataPoints ) //grab the last (this.dataPoints) number of points in our array
  return data
}

BarGraph.prototype.display = function(ctx, data) {

  var self = this
    , xScale
    , yScale
    , chart
    , t = self.transition.duration
    , toAll
    , min
    , max
  //ensure separator isn't too big compared to barWidth. i.e barWidth must be at least 1 px
  (function fixBarWidth() {
    self.barWidth = ((self.width - (self.separator * self.dataPoints)) / self.dataPoints)
    self.barWidth = Math.floor(self.barWidth)
    if (self.barWidth < 1) {
      self.separator = Math.floor(self.separator/1.25)
      fixBarWidth()
    }
  })()

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

  chart.enter().append('svg:rect')
       .attr('x', function(d, i) { return toAll.x(d, i+1)})
       .attr('y', toAll.y)
       .attr('width', toAll.width)
       .attr('height', toAll.height)
  _u.applyStylesToD3Graph(Object.getOwnPropertyNames(self.style), self.style, chart)

  chart.transition()
       .duration(t)
       .ease(self.transition.ease)
       .attr('x', function(d,i) { return toAll.x(d, i) })
       .attr('y', toAll.y)
       .attr('height', toAll.height)
  _u.applyStylesToD3Graph(Object.getOwnPropertyNames(self.transition.style), self.transition.style, chart)

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
    , transitionTime : self.transition.duration
    , intervalLength : self.barWidth + self.separator
    , text : function (d) { return '' + Math.floor(d.val) }
    , fill : self.text.color || 'red'
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
    , avg
  Object.getOwnPropertyNames(data).forEach(function(key) {
    avg = _u.averageOfArray(data[key], function(d) { return d.val })
    d3Data.push(avg)
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

  chart.enter().append('svg:circle')
       .attr('cx', toAll.cx)
       .attr('r', function(d) { return toAll.r(d) })
       .attr('cy', toAll.cy)
  _u.applyStylesToD3Graph(Object.getOwnPropertyNames(self.style), self.style, chart) //apply styles to graph

  chart.transition()
       .duration(self.transition.duration)
       .ease(self.transition.ease)
       .attr('r', function(d) { return toAll.r(d) })
       .attr('cx', toAll.cx)
       .attr('cy', toAll.cy)
  _u.applyStylesToD3Graph(Object.getOwnPropertyNames(self.transition.style), self.transition.style, chart) //apply styles to graph

  chart.exit().remove()

}

CircleGraph.prototype.displayText = function (ctx, data) {
  data = this.unpackData(data)
  var self = this
    , textOpts
  textOpts = {
    height : self.height
    , width : self.width
    , transitionTime : self.transition.duration
    , text : function (d) { return '' + Math.floor(d) }
    , fill : self.text.color
  }

  drawText(ctx, textOpts, data)
}

//inspired by => http://bl.ocks.org/1062544
//A LOT of work still needs to be done on this.
//how should we react to all the info being presented at once. The point of this graph is to reflect the frequency of the data
//being streamed to us, but our stream recieves all of the data at once so it appears as if all the data has the same frequency. Maybe we should
//use timestamps?
//what should I do about displaying text
function FrequencyGraph(opts) {
  if (!(this instanceof FrequencyGraph)) return new FrequencyGraph(opts)
  var defaults = {
    transition : {
      ease : Math.sqrt
      , duration : 3000
      , style : {
        'stroke-opacity' : 1e-4
      }
    }
    , style : {
       fill : 'white'
       , stroke : 'gray'
       , 'stroke-opacity' : 1
    }
  }
  opts = opts || {}
  _u.copyDefaults(defaults, opts)
  Graph.call(this, opts)
  this._timestamps = {}
}
util.inherits(FrequencyGraph, Graph)

/**
 *
 * format =>
 * {
 *   name : ...
 *   __type : ...
 *   (important part)
 *   val : timestamp
 * }
 *
 * if timestamp hasn't changed since last display call, we will not update with a circle
 *
 */
FrequencyGraph.prototype.unpackData = function (data) {
  var d3Data = []
    , avg
    , self = this
  Object.getOwnPropertyNames(data).forEach(function(key) {
    var arr = data[key]
      , timestamp
    timestamp = arr[arr.length - 1].val //retrieve latest buffer's val attribute. this is assumed to be a timeStamp.
    if (timestamp !== self._timestamps[key]) {
      self._timestamps[key] = timestamp //new update to particular timestamp key
      d3Data.push(timestamp)
    } else {
      d3Data.push(null) //flag indicate that data hasn't been updated
    }
  })
  return d3Data
}

FrequencyGraph.prototype.display = function (ctx, data) {
  var self = this
    , d3Data
    , chart
    , rScale
    , xScale
    , toAll = {}
    , intervalLength
    , min
    , max
    , colorScale = d3.scale.category20c()
    , styles
    , transitionStyles

  self.dataPoints = Object.getOwnPropertyNames(self._timestamps).length
  //create new array with averages of values under each buf.name
  d3Data = this.unpackData(data)

  min = d3.min(d3Data, function(d) { return d - self.separator })
  max = d3.max(d3Data, function(d) {  return d + self.separator })

  rScale = d3.scale.linear()
             .domain([min - 5, max + 5])
             .range([2, Math.min(self.width/self.dataPoints/2, self.height/2.5)])
  intervalLength = self.width/self.dataPoints

  toAll.cx = function (d, i) { return (i+1)*intervalLength - (intervalLength/2) }
  toAll.r = rScale
  toAll.cy = self.height/2 - 0.5
  //the point here is that we don't have any lingering data with this method. We are continually presenting new data
  //so we do not need to continually query old data and re-enter new data.
  styles = Object.getOwnPropertyNames(self.style)
  transitionStyles = Object.getOwnPropertyNames(self.transition.style)

  d3Data.forEach(function(dat, ix) {
    if (dat === null) return //flag indicating data hasn't been updated since last redraw

    var graph = ctx.append('svg:circle')
         .attr('r', toAll.r(dat) / 8)
         .attr('cx', toAll.cx(dat, ix))
         .attr('cy', toAll.cy)

    _u.applyStylesToD3Graph(styles, self.style, graph) //apply styles to graph

    graph = graph.transition()
       .duration(self.transition.duration)
       .ease(self.transition.ease)
       .attr('r', toAll.r(dat))
       .attr('cx', toAll.cx(dat, ix))
       .attr('cy', toAll.cy)

    _u.applyStylesToD3Graph(transitionStyles, self.transition.style, graph) //apply transition.styles
    graph.remove()
  })


}

FrequencyGraph.prototype.displayText = function (ctx, data) {
  var self = this
    , textOpts
    , textData = []
  Object.getOwnPropertyNames(data).forEach(function(prop) {
    var arr = data[prop]
      , dt
    //strictly speaking, this number isn't the frequency, but rather DeltaTime. Consider using an actual frequency in hertz or such
    if (arr.length > 1) dt = arr[arr.length - 1].val - arr[arr.length - 2].val
    else dt = ''
    textData.push(dt) //push the difference between the last two values. i.e the delta
  })
  textOpts = {
    height : self.height
    , width : self.width
    , transitionTime : self.transition.time
    , fill : self.text.color
  }

  drawText(ctx, textOpts, textData)
}

function drawText(ctx, opts, data) {
  if (!opts.height || !opts.width) throw new Error('need height and width')

  var chart
    , intervalLength = opts.intervalLength || (opts.width / data.length)
    , t = opts.transitionTime || 1000

  opts.text = opts.text || String

  chart = ctx.selectAll('text')
              .data(data)

  chart.enter().append('svg:text')
       .attr('x', opts.x || function (d, i) { return intervalLength*i })
       .attr('y', opts.y || (opts.height - 28))
       .attr('dy', opts.dy || '1.2em')
       .attr('dx', opts.dx || (intervalLength/2))
       .attr('text-anchor', opts['text-anchor'] || 'middle')
       .attr('fill', opts.fill || 'gray')
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


