
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

/**
 * invoke nestedProperty(obj, 'hello.world.foo', 'bar')
 * will assign obj['hello']['world']['foo'] = 'bar'
 */
function nestedProperty(obj, string, value) {
  var nested = obj
    , portions = string.split('.')
    , prop
  exports.debug('nestedProperty portions: ' + portions)
  while (portions.length) {
    prop = portions.shift()
    if (!portions.length) nested[prop] = value //reached last property
    else nested = nested[prop]                 //continue nesting deeper

    //TODO: consider throwing an error here
    if (!nested) return
  }
}
exports.nestedProperty = nestedProperty

//copy over defaults
//TODO, write a test for this
function copyDefaults(def, opts) {
  Object.getOwnPropertyNames(def).forEach(function(prop) {
    if (!opts[prop]) opts[prop] = def[prop]
    else if (typeof opts[prop] === 'object' && def[prop]) { //apply to sub properties of object
      exports.debug('recursing deeper on copying objects with prop: ' + prop)
      copyDefaults(def[prop], opts[prop])
    }
  })
}
exports.copyDefaults = copyDefaults


//apply given array of styles to a d3 context
//styles is a list of properties that belong to fromOpts
function applyStylesToD3Graph (styles, fromOpts, ctx) {
  var aStyle
    , i
  for (i = 0; i < styles.length; i++) {
    aStyle = styles[i]
    ctx.style(aStyle, fromOpts[aStyle])
  }
}
exports.applyStylesToD3Graph = applyStylesToD3Graph







