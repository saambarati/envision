
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true, envisage:true,  */

$(document).ready(function() {
  console.log('about to start stream')
  var graphStream = envisage.graphStream
    , dataStream = envisage.dataStream
    , opts
    , graphOpts
    , graphOpts2
    , dStream
    , circleOpts
    , cDatOpts

  opts = {
    url : '/pipe/'
    //, averagingData : true
    //, averageDataInterval : 2000
  }

  graphOpts = {
    dataPoints : 10
    , separator : 4
    , height : 500
    , width : 900
    , selector : '#bar1'
    , transitionTime : 750
  }
  graphOpts2 = {
    dataPoints : 8
    , separator : 1
    , height : 500
    , width : 900
    , selector : '#bar2'
    , transitionTime : 500
  }

  cDatOpts = {
    url : '/pipecircle/'
    , averagingData : true
    , averageDataInterval : 1500
  }

  circleOpts = {
    dataPoints : 4
    , separator : 10
    , height : 100
    , width : 600
    , selector : '#circle1'
    , transitionTime : 1000
  }
  

  dStream = dataStream(opts)
  dStream.pipe(graphStream.BarGraph(graphOpts).filter('requestTime'))
  dStream.pipe(graphStream.BarGraph(graphOpts2).filter('requestTime'))

  dataStream(cDatOpts).pipe(graphStream.CircleGraph(circleOpts).filter('data1', 'data2', 'data3', 'data4', 'data5', 'data6'))
})
