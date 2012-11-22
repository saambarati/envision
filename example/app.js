
var tako = require('tako')
  , logStream = require('logStream')
  , profiles = require('profiles')
  , profiler = profiles()
  , request = require('request')
  , fs = require('fs')
  , logger = logStream()
  , app = tako()
  , PORT = 8081
  , path = require('path')

app.route('/').html(function(req, res) {
  console.log('serving home page')
  res.setHeader('content-type', 'text/html')
  res.statusCode = 200
  fs.createReadStream(path.join(__dirname, 'public/home.html')).pipe(res)
})

app.route('/public/*').files(path.join(__dirname, 'public'))

app.route('/pipe', function(req, res) {
  //res.setEncoding('ut8')
  console.log('beginning a data pipe')
  var endTime = 1000 * 60 * 2  //2 mins
  res.setHeader('content-type', 'x-json-stream')
  profiles.PS(profiler, endTime).pipe(res)
})


app.route('/pipecircle', function(req, res) {
  //res.setEncoding('ut8')
  console.log('beginning a data pipe for circle')
  var endTime = 1000 * 60 * 10  //10 mins
  res.setHeader('content-type', 'x-json-stream')
  var s = profiles.PS(profiler, endTime).filter('data1', 'data2', 'data3', 'data4', 'data5', 'data6')
  //s.pipe(process.stdout)
  s.pipe(res)
})
app.route('/pipefreq', function(req, res) {
  //res.setEncoding('ut8')
  console.log('beginning a data pipe for frequency')
  var endTime = 1000 * 60 * 10  //10 mins
  res.setHeader('content-type', 'x-json-stream')
  var s = profiles.PS(profiler, endTime).filter('freq1', 'freq2', 'freq3', 'freq4', 'freq5', 'freq6')
  //s.pipe(process.stdout)
  s.pipe(res)
})

setInterval(function() {
  profiler.stat('data1', Math.random() * 600 + 20)
  profiler.stat('data2', Math.random() * 600 + 20)
  profiler.stat('data3', Math.random() * 600 + 20)
  profiler.stat('data4', Math.random() * 600 + 20)
  profiler.stat('data5', Math.random() * 600 + 20)
  profiler.stat('data6', Math.random() * 600 + 20)
}, 1000)

app.httpServer.listen(PORT)

//for bar graph
function test() {
  var endFunc = profiler.beg('requestTime')
  request.head('http://wikipedia.org', function(e, res, body) {
    //console.log(endFunc())
    endFunc()
    setTimeout(test, 2000)
  })
}
test()

//for freq graph
for (var i = 1; i <= 6; i++) {
  (function inner(t) {
    var freq = Math.random()*3000
    profiler.stat('freq'+t,  Date.now() )
    setTimeout(function() { inner(t) }, freq)
  })(i)
}

logger.log('open your browser to: "http://localhost:'+PORT+'"')
//console.log(__dirname)
//console.log(__filename)
