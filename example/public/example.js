
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true, envision:true,  */
function begin() {
  console.log('about to start stream')
  var graphStream = envision.graphStream
    , dataStream = envision.dataStream
    , opts
    , graphOpts
    , cDatOpts
    , barGraph
    , circleGraph
    , freqGraph

  graphOpts = {
    selector : '#bar1'
    , height : 200
    , width : 800
  }
  barGraph = envision.graph(graphOpts).filter('requestTime') //creates a graph stream object. filters our non-requestTime buffers that are streamed to it
  barGraph.draw('bar') //returns Graph object
    .title('Response Time')
    .attr('dataPoints', 10) //number of bars
    .attr('transitionTime', 750)
    .attr('separator', 2) //pixels between bars
  //retrieves previously made bar graph, useful when one graphStream has mutpile graphs, or when you don't want to hold a reference to bar, but just the graphStream
  //this is purely for demonstration. Usually, you would do this all through one method chaining
  barGraph.graph('bar')
    .attr('text.display', true)
    .attr('text.color', 'red')
  //feed in data from this url //pipe this data to the graph stream
  //the format here is '\n' delimited JSON buffers
  //look at http://github.com/saambarati/profiles for the correct json buffer type
  dataStream('/pipe').pipe(barGraph)


  circleGraph = envision.graph({selector : '#circle1', height : 400, width: 800}) //circle
  circleGraph.draw('circle') //.draw() called on graphStream returns a Graph object
    .title('Animating Circles')
    .attr('transitionTime', 800)
    //.attr('text.display', true) //true by default, this line isn't necessary
    .attr('text.color', '#ff001a') //embedded object attributes can be accessed through dot notation like regular object. 'text.color' accesses the color attribute on the text object
  cDatOpts = {
    url : '/pipecircle'
    , averagingData : true //averages incoming data
    , averageDataInterval : 2000 // and emits new data events every 2 seconds
  }
  dataStream(cDatOpts).pipe(circleGraph)

  freqGraph = envision.graph({selector : '#freq', height : 400, width : 800})
  freqGraph.draw('frequency')
    .title('Frequency')
    .attr('transitionTime', 4000)
    .attr('text.display', false) //this isn't working quite right yet
  dataStream('/pipefreq').pipe(freqGraph)
}

$(document).ready(begin)
