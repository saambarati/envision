
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true,  */

(function(jQuery) {
  jQuery(document).ready(function() {
    var mdiv = jQuery('#main')

    Array.prototype.max = function() {
      return Math.max.apply(Math, Array.prototype.slice.apply(this))
    }
    Array.prototype.average = function () {
      for (var i = 0, sum = 0; i < this.length; i++) {
        sum += 0 + this[i]
      }
      return sum / this.length
    }

    var svg = d3.select('body')
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')

    var barW = 30
      , separator = 1

    function startDummy(chart, totW, totH, barWidth, sep) {
      var num = Math.floor(totW/(barWidth+sep))
        , dummy = []
        , i
      for (i = 0; i < num-2; i++) {
        dummy[i] = 10
      }
       chart.selectAll('rect').data(dummy).enter()
            .append('rect')
            .attr('x', function(d, i) { return barWidth*i + separator*i })
            .attr('y', function(d) { return totH })
            .attr('width', function(d) { return barWidth })
            .attr('height', function(d) { return 1 })

       chart.selectAll('text').data(dummy).enter()
            .append('text')
            .text(function(d) { return '' + d })
            .attr('x', function (d, i) { return i * (barWidth+sep) })
            .attr('y', totH + 20)
    }
    startDummy(svg, window.innerWidth-100, window.innerHeight-100,  barW, separator)

    function draw(data) {
      var newL
      if ((barW+separator) * data.length > window.innerWidth-100) {
        newL = (window.innerWidth-100)/(barW + separator) 
        data = data.slice(0, Math.floor(newL-1))
      }
      var graphHeight = window.innerHeight - 100
         , max = data.max()
         , dh = barW + separator
         , textXoff = dh/2
         , textYoff = graphHeight + 30
         // multiply each value to get height of bar
         , barHeightMult = graphHeight / max
         , rect
         , text

      console.log('bar width = ' + barW)
      console.log('data length = ' + data.length )
      rect = svg.selectAll('rect')
           .data(data)
      rect.enter().insert('rect') 
          .attr('x', function(d, i) { return i * dh })
          .attr('y', function(d){ return graphHeight - d*barHeightMult })
          .attr('width', barW)
          .attr('height', function(d) { return d * barHeightMult })
        .transition()
          .duration(500)
          .attr('x', function(d, i){ return i*dh })
          .attr('height', function(d) { return d * barHeightMult })

      rect.transition()
          .duration(500) 
          .attr('x', function(d, i) { return i * dh })
          .attr('height', function(d) { return d * barHeightMult })
          .attr('y', function(d) { return graphHeight - d*barHeightMult })

      rect.exit().transition()
          .duration(500)
          .attr('x', function(d, i) { return (i+1) * (dh) })
          .remove()
        
       text = svg.selectAll('text').data(data)
          .transition()
            .duration(500)
            .attr('x', function (d, i) { return i * (dh) })
            .text(function(d) { return '' + (d | 0) })
    }
   
    (function() {
      var req = new XMLHttpRequest()
         , place = 0
         , dataPoints = []
         , buffer = []

      function progress(evt) {
        var data = req.responseText.slice(place)
          , single
          , i
        place += data.length
        data = data.split('\n')
        for (i = data.length-2; i >= 0; i--) { //-2 b/c the final \n will be an empty string
          single = JSON.parse(data[i])
          buffer.push(single.val)
        }
        //draw(dataPoints)
      }
      req.addEventListener('progress', progress)
      req.open('GET', 'http://localhost:8081/pipe', true)
      req.send()
      setInterval(function() {
        if (!buffer.length) return
        var ave = buffer.average()
        dataPoints.unshift(0+ave)
        draw(dataPoints)
        buffer = []
      }, 100)
    }())

  })
}($))
