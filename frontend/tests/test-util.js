
var _u = require('../utilities')
  , assert = require('assert')

;(function() {
  var obj = {}
  _u.nestedProperty(obj, 'name', 'saam')
  assert(obj.name === 'saam')

  _u.nestedProperty(obj, 'text', {})
  assert(obj.text !== undefined)

  _u.nestedProperty(obj, 'text.color', 'red')
  assert(obj.text.color === 'red')

  _u.nestedProperty(obj, 'deep', {sea:'water'})
  assert(obj.deep.sea === 'water')
})()
