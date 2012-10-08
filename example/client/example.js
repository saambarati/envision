
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

  opts = {
    url : '/pipe/'
    //, averagingData : true
    //, averageDataInterval : 2000
  }

  graphOpts = {
    dataPoints : 10
    , selector : '#bar1'
    , height : 200
    , width : 800
  }

  cDatOpts = {
    url : '/pipecircle/'
    , averagingData : true
    , averageDataInterval : 2000
  }


  dStream = dataStream(opts)
  //dStream.pipe(graphStream.BarGraph(graphOpts).filter('requestTime'))
  //dStream.pipe(graphStream.BarGraph(graphOpts2).filter('requestTime'))

  //dataStream(cDatOpts).pipe(graphStream.CircleGraph(circleOpts))

  var graph = envision.graph(graphOpts).filter('requestTime')
  graph.draw('bar')
       .attr('text', true)
       .attr('dataPoints', 10)
       .attr('transitionTime', 750)
       .attr('separator', 2)
  dStream.pipe(graph)

  var cGraph = envision.graph({selector : '#circle1', height : 400, width: 800})
  dataStream(cDatOpts).pipe(cGraph)
  cGraph.draw('circle')
        .attr('text', true)
        .attr('transitionTime', 900)

}

$(document).ready(begin)
