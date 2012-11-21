
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true, envision:true,  */
function begin() {
  console.log('about to start stream')
  var dataStream = envision.dataStream
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
  barGraph = envision.graphStream(graphOpts).filter('requestTime') //creates a graph stream object. filters our non-requestTime buffers that are streamed to it
  barGraph.graph('bar') //returns Graph object
    .title('Response Time')
    .attr('dataPoints', 10) //number of bars
    .attr('transition.duration', 600)
    .attr('separator', 2) //pixels between bars
  //retrieves previously made bar graph, useful when one graphStream has mutpile graphs, or when you don't want to hold a reference to bar, but just the graphStream
  //this is purely for demonstration. Usually, you would do this all through one method chaining
  barGraph.getGraph('bar')
    .attr('text.display', true)
    .attr('text.color', 'black')
  //feed in data from this url //pipe this data to the graph stream
  //the format here is '\n' delimited JSON buffers
  //look at http://github.com/saambarati/profiles for the correct json buffer type
  dataStream('/pipe').pipe(barGraph)


  circleGraph = envision.graphStream({selector : '#circle1', height : 400, width: 800}) //circle
  circleGraph.graph('circle') //.draw() called on graphStream returns a Graph object
    .title('Animating Circles')
    .attr('style.fill', 'gray')
    .attr('style.stroke', 'brown')
    .attr('style.stroke-width', 4)
    .attr('transtion.duration', 800)
    .attr('text.display', true) //true by default, this line isn't necessary
    .attr('text.color', 'black') //embedded object attributes can be accessed through dot notation like regular object. 'text.color' accesses the color attribute on the text object
  cDatOpts = {
    url : '/pipecircle'
    , averageDataInterval : 2000 // averages data and emits new data events every 2 seconds
  }
  dataStream(cDatOpts).pipe(circleGraph)

  freqGraph = envision.graphStream({selector : '#freq', height : 400, width : 800})
  freqGraph.graph('frequency')
    .title('Frequency')
    .attr('text.display', false) //this isn't working quite right yet
    .attr('transition.stroke', 'red')
    .attr('transition.style.stroke-width', 0.8)
  dataStream('/pipefreq').pipe(freqGraph)

  //for testing purposes. Launch up a debugger and check out the properties on these objects
  window.__freqGraph = freqGraph.graph('frequency')
  window.__circleGraph = circleGraph.graph('circle')
}

$(document).ready(begin)
