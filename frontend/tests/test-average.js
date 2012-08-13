var dat = [
   {"name":"data2","val":75,"__profileType":"stat"}
  ,{"name":"data2","val":100,"__profileType":"stat"}
  ,{"name":"data2","val":50,"__profileType":"stat"}

  ,{"name":"data3","val":23.4,"__profileType":"stat"}
  ,{"name":"data3","val":40.5,"__profileType":"stat"}
  ,{"name":"data3","val":5,"__profileType":"stat"}
  ,{"name":"data3","val":5.1010,"__profileType":"stat"}

  ,{"name":"data1","val":10,"__profileType":"stat"}
  ,{"name":"data1","val":20,"__profileType":"stat"}
  ,{"name":"data1","val":30,"__profileType":"stat"}
]



var opts = {
  url : '/pipe/'
  , averagingData : true
  , averageDataInterval : 2000
  , __test : true
}
var dataStream = require('../dataStream')
  , assert = require('assert')
  , s = dataStream(opts)
 

s.pipe(process.stdout)
dat.forEach(function(val) {
  s._averageDataBuf.push(JSON.stringify(val))
})

var i = 0
function end() {
  i++
  if (i === 3) {
    console.log('\npassed all tests')
    process.exit(0)
  }
}
s.on('data', function(d) {
  d = JSON.parse(d)
  switch (d.name) {
    case 'data1' :
      assert(d.val === 20)
      break;
    case 'data2' :
      assert(d.val === 75)
      break;
    case 'data3' :
      assert(d.val === ((23.4 + 40.5 + 5 + 5.1010)/ 4))
      break;
  }
  end()
})
s._clearAverages()
