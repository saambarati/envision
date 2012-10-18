
exports.DEBUG = true

if (exports.DEBUG) {
  exports.debug = function() {
    console.log.apply(console, ['DEBUG: '].concat([].slice.call(arguments)))
  }
} else {
  exports.debug = function() {}
}

/*
 * utilities
*/

function averageOfArray (arr, func) {
  if (!func) func = function(d) { return d }
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + func(arr[i])
  }
  return sum / arr.length
}
exports.averageOfArray = averageOfArray

//function must be called with 'this' mapped to the object you want altered
//already exisiting keys will be overridden
function appendPropertiesFrom(fromObj, toObj) {
  var keys = Object.getOwnPropertyNames(fromObj)
    , prop
    , i
  for (i = 0; i < keys.length; i++) {
    prop = keys[i]
    toObj[prop] = fromObj[prop]
  }
}
exports.appendPropertiesFrom = appendPropertiesFrom

//copy 1 layer deep in the object
function shallowCopy(obj) {
  var ret = {}
    , keys = Object.getOwnPropertyNames(obj)
    , key
    , i
  for (i = 0; i < keys.length; i++) {
    key = keys[i]
    ret[key] = obj[key]
  }

  return ret
}
exports.shallowCopy = shallowCopy

//i.e invoke(obj, 'hello.world.foo')
//will return obj['hello']['world']['foo']
function nestedProperty(obj, string) {
  var nested = obj
    , portions = string.split('.')
    , i
    , prop

  for (i = 0; i < portions.length; i++) {
    prop = portions[i]
    nested = nested[prop]
    if (!nested) return null
  }
  return nested
}
exports.nestedProperty = nestedProperty

//copy over defaults
function copyDefaults(def, opt) {
  Object.getOwnPropertyNames(def).forEach(function(prop) {
    if (!opt[prop]) opt[prop] = def[prop]
  })
}
exports.copyDefaults = copyDefaults

