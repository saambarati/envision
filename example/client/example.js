
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
    //, dataPoints : 10
    , height : 200
    , width : 800
  }
  var aGS = envision.graph(graphOpts).filter('requestTime')
  aGS.draw('bar') //returns Graph object
    .attr('text', true)
    .attr('dataPoints', 10)
    .attr('transitionTime', 750)
    .attr('separator', 2)
  dStream = dataStream('/pipe')
  dStream.pipe(aGS)

  //this dynamic transition doesn't work properly, work on fixing it
 // setTimeout(function() {
 //   aGS.graph('bar') //access 'bar' graph from earlier
 //     .attr('dataPoints', 20)
 // }, 10000) //after 10 seconds, increase datapoints

  var cGS = envision.graph({selector : '#circle1', height : 400, width: 800}) //circle
  cGS.draw('circle') //.draw() called on graphStream returns a Graph object
    .attr('text', true)
    .attr('transitionTime', 900)

  cDatOpts = {
    url : '/pipecircle'
    , averagingData : true
    , averageDataInterval : 2000
  }
  dataStream(cDatOpts).pipe(cGS)
}

$(document).ready(begin)
