
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true, envision:true,  */

function begin() {
  console.log('about to start stream')
  var graphStream = envision.graphStream
    , dataStream = envision.dataStream
    , opts
    , graphOpts
    , graphOpts2
    , dStream
    , circleOpts
    , cDatOpts

  graphOpts = {
    selector : '#bar1'
    , height : 200
    , width : 800
  }

  var aGS = envision.graph(graphOpts).filter('requestTime') //creates a graph stream object

  aGS.draw('bar') //returns Graph object
    .attr('dataPoints', 10)
    .attr('transitionTime', 750)
    .attr('separator', 2)
  //retrieves previously made bar graph, useful when one graphStream has mutpile graphs, or when you don't want to hold a reference to bar, but just the graphStream
  aGS.graph('bar')
    .attr('text.display', true)
    .attr('text.color', 'red')

  dStream = dataStream('/pipe') //feed in data from this url
  dStream.pipe(aGS) //pipe this data to the graph stream

  //this dynamic transition doesn't work properly, work on fixing it
 // setTimeout(function() {
 //   aGS.graph('bar') //access 'bar' graph from earlier
 //     .attr('dataPoints', 20)
 // }, 10000) //after 10 seconds, increase datapoints

  var cGS = envision.graph({selector : '#circle1', height : 400, width: 800}) //circle
  cGS.draw('circle') //.draw() called on graphStream returns a Graph object
    .attr('transitionTime', 800)
    //.attr('text.display', true) //true by default
    .attr('text.color', '#ff001a')

  cDatOpts = {
    url : '/pipecircle'
    , averagingData : true
    , averageDataInterval : 2000
  }
  dataStream(cDatOpts).pipe(cGS)

  var fGS = envision.graph({selector : '#freq', height : 400, width : 800})
  fGS.draw('frequency')
    .attr('transitionTime', 4000)
    .attr('text.display', false) //figure out how to make this work better
  dataStream('/pipefreq').pipe(fGS)
}

$(document).ready(begin)
