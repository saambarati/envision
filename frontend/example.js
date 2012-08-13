
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true,  */

//var jQuery = $
$(document).ready(function() {
  console.log('about to start stream')
  var graphStream = require('./graphStream.js')
    , dataStream = require('./dataStream.js')
    , opts
    , graphOpts
    , graphOpts2
    , dStream
    , circleOpts

  opts = {
    url : '/pipe/'
    , averagingData : true
    , averageDataInterval : 2000
  }

  graphOpts = {
    dataPoints : 15
    , separator : 4
    , height : 500
    , width : 600
    , selector : '#bar1'
    , transitionTime : 1500
  }
  graphOpts2 = {
    dataPoints : 20
    , separator : 1
    , height : 500
    , width : 600
    , selector : '#bar2'
    , transitionTime : 1500
  }

  circleOpts = {
    dataPoints : 4
    , separator : 10
    , height : 500
    , width : 600
    , selector : '#circle1'
    , transitionTime : 1000
  }

  dStream = dataStream(opts)
  dStream.pipe(graphStream.BarGraph(graphOpts).filter('requestTime'))
  dStream.pipe(graphStream.BarGraph(graphOpts2).filter('requestTime'))

  dataStream('/pipecircle/').pipe(graphStream.CircleGraph(circleOpts))
})
