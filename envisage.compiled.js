(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    
    require.define = function (filename, fn) {
        if (require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};
});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process){var process = module.exports = {};

process.nextTick = (function () {
    var queue = [];
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;
    
    if (canPost) {
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);
    }
    
    return function (fn) {
        if (canPost) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        }
        else setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();
});

require.define("vm",function(require,module,exports,__dirname,__filename,process){module.exports = require("vm-browserify")});

require.define("/node_modules/vm-browserify/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index.js"}});

require.define("/node_modules/vm-browserify/index.js",function(require,module,exports,__dirname,__filename,process){var Object_keys = function (obj) {
    if (Object.keys) return Object.keys(obj)
    else {
        var res = [];
        for (var key in obj) res.push(key)
        return res;
    }
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

var Script = exports.Script = function NodeScript (code) {
    if (!(this instanceof Script)) return new Script(code);
    this.code = code;
};

Script.prototype.runInNewContext = function (context) {
    if (!context) context = {};
    
    var iframe = document.createElement('iframe');
    if (!iframe.style) iframe.style = {};
    iframe.style.display = 'none';
    
    document.body.appendChild(iframe);
    
    var win = iframe.contentWindow;
    
    forEach(Object_keys(context), function (key) {
        win[key] = context[key];
    });
     
    if (!win.eval && win.execScript) {
        // win.eval() magically appears when this is called in IE:
        win.execScript('null');
    }
    
    var res = win.eval(this.code);
    
    forEach(Object_keys(win), function (key) {
        context[key] = win[key];
    });
    
    document.body.removeChild(iframe);
    
    return res;
};

Script.prototype.runInThisContext = function () {
    return eval(this.code); // maybe...
};

Script.prototype.runInContext = function (context) {
    // seems to be just runInNewContext on magical context objects which are
    // otherwise indistinguishable from objects except plain old objects
    // for the parameter segfaults node
    return this.runInNewContext(context);
};

forEach(Object_keys(Script.prototype), function (name) {
    exports[name] = Script[name] = function (code) {
        var s = Script(code);
        return s[name].apply(s, [].slice.call(arguments, 1));
    };
});

exports.createScript = function (code) {
    return exports.Script(code);
};

exports.createContext = Script.createContext = function (context) {
    // not really sure what this one does
    // seems to just make a shallow copy
    var copy = {};
    if(typeof context === 'object') {
        forEach(Object_keys(context), function (key) {
            copy[key] = context[key];
        });
    }
    return copy;
};
});

require.define("/graphStream.js",function(require,module,exports,__dirname,__filename,process){
/*global $:true, jQuery:true, console:true, document:true, window:true, d3:true, XMLHttpRequest:true,  */

var Stream = require('stream')
  , util = require('util')


/*
 * High level overview of classes:
 *
 * GraphStream is a writable stream that takes incoming JSON buffers and parses through them
 * GraphStream calls the method `draw` when its own `write` method is called. `draw` is meant to be implemented by its subclasses
 * 
 * Graph is a subclass of GraphStream and it is also meant to be subclassed. 
 * Graph just provides a unified interface for some basic attributes that all Graphs are expected to have such as {width, height, DOM selector, etc}
*/

//opts are passed down to Graph object
function GraphStream(opts) {
  if (!(this instanceof GraphStream)) return new GraphStream(opts)

  Stream.call(this)
  this.readable = false
  this.writable = true

 // this.once('pipe', function(src) {
 // 
 // })
  this._buffers = []
  this._filters = []
}
util.inherits(GraphStream, Stream)

GraphStream.prototype.write = function (buf) {
  buf = JSON.parse(buf)
  if (this._filters.length && this._filters.indexOf(buf.name) === -1) return //ignore certain buffers

  this.draw(buf)
  console.log('incoming graph data')
}

GraphStream.prototype.end = function (buf) {
  if (buf) this.write(buf)
  this.emit('end')
}
GraphStream.prototype.filter = function() {
  this._filters = this._filters.concat(Array.prototype.slice.apply(arguments))
  return this
}

//exports.GraphStream = GraphStream


/*
 * opts  =>
 *   width      : svg context width :: default 800
 *   height     : svg context height :: default 800 
 *   selector   : #div, html el :: <body> default
 *   className  : .class for css :: 'graph' default
 *   dataPoints : number of dataPoints expected in the graph :: default 15
*/

function Graph (opts) {
  if (!(this instanceof Graph)) return new Graph(opts)

  GraphStream.call(this)
  if (!opts) opts = {}

  //TODO: if contains %, query width and adjust to pixels
  this.width = opts.width || '800'
  this.height = opts.height || '800'
  this.dataPoints = opts.dataPoints || null
  this.data = null
  this.separator = opts.separator || null
  this.transitionTime = opts.transitionTime || 750

  this.ctx = d3.select(opts.selector || 'body')
    .append('svg')
    .attr('class', opts.className || 'graph')
    .attr('width', this.width)
    .attr('height', this.height)

}
util.inherits(Graph, GraphStream)
Graph.prototype.draw = function () { throw new Error('draw method must be implemented by subclass')} 


/*
 *   separator : bar separator   :: default 1
*/
function BarGraph(opts) {
  if (!(this instanceof BarGraph)) return new BarGraph(opts)

  Graph.call(this, opts)

  this.data = d3.range(this.dataPoints).map(function() { return {val:2, name:'dummy'} }) //dummy data
  this.separator = opts.separator || 1 

  //this.barWidth = (this.width / this.dataPoints) - (this.separator * this.dataPoints)
  function fixBarWidth() { //if separator is too big compared to barWidth
    this.barWidth = (((this.width - ((this.separator-1) * this.dataPoints))) / this.dataPoints)
    if (this.barWidth <= 1) {
      this.separator = Math.floor(this.separator/1.25)
      fixBarWidth.call(this)
    }
  }
  fixBarWidth.call(this) //adjust bar width to not be less than 1 px

  this.ctx.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height - 0.5)
      .attr('y2', this.height - 0.5)
      .style('stroke', '#000')

}
util.inherits(BarGraph, Graph)
exports.BarGraph = BarGraph

BarGraph.prototype.draw = function (val) {
  if (!val) return

  var self = this
    , xScale
    , yScale
    , chart
    , t = self.transitionTime

  self.data.push(val)
  if (self.data.length > self.dataPoints) self.data.shift()

  xScale = d3.scale.linear()
             .domain([0, self.data.length])
             .range([0, self.width])
  yScale = d3.scale.linear()
             .domain([d3.min(self.data, function(d) { return d.val - 10 }) , d3.max(self.data, function(d) { return d.val  + 10 })])
             .range([0, self.height])

  function toAll(type) {
     //attributes = ['x', 'y', 'width', 'height']
    switch (type) {
      case 'x' : return function(d, i) { return i*self.barWidth + i*self.separator - 0.5}
      case 'y' : return function (d) { return self.height - yScale(d.val) - 0.5 }
      case 'width' : return function () { return self.barWidth - 0.5 } 
      case 'height' : return function(d) { return yScale(d.val) - 0.5 }  //TODO : look into anti-aliasing prevention
    }
  }

  chart = self.ctx.selectAll('rect')
         .data(self.data)

  chart.enter().append('rect')
       .attr('x', function(d, i) { return toAll('x')(d, i+1)})
       .attr('y', toAll('y'))
       .attr('width', toAll('width'))
       .attr('height', toAll('height'))
     .transition()
       .duration(t)
       .attr('x', function(d, i) { return toAll('x')(d, i)})


  chart.transition()
       .duration(t)
       .attr('x', function(d,i) { return toAll('x')(d, i) })
       .attr('y', toAll('y'))
       .attr('height', toAll('height'))

  chart.exit()
       .transition()
       .duration(t)
       .attr('x', function (d, i) { return xScale(i-1) - 0.5 })
       .remove()

  var textOpts = {
    height : self.height
    , width : self.width
    , transitionTime : self.transitionTime
    , intervalLength : self.barWidth + self.separator
    , text : function (d) { return '' + Math.floor(d.val) }
    , fill : 'gray'
  }
  drawText(self.ctx, textOpts, self.data)

}

function CircleGraph (opts) {
  if (!(this instanceof CircleGraph)) return new CircleGraph(opts)

  Graph.call(this, opts)
  this.data = {}

  //draw axis
  this.ctx.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', this.height - 0.5)
      .attr('y2', this.height - 0.5)
      .style('stroke', '#000')
}
util.inherits(CircleGraph, Graph)
exports.CircleGraph = CircleGraph

CircleGraph.prototype.filter = function() {
  Graph.prototype.filter.apply(this, arguments)
  this.dataPoints = this._filters.length
  return this
}

CircleGraph.prototype.draw = function (buf) {
  var self = this
    , d3Data = []
    , chart
    , rScale
    , xScale
    , toAll = {}
    , intervalLength
    , t = self.transitionTime

  //each name will be an array
  if (!this.data[buf.name]) this.data[buf.name] = []
  this.data[buf.name].push(buf.val)

  self.dataPoints = Object.getOwnPropertyNames(self.data).length
  //create new array with averages of values under each buf.name
  Object.getOwnPropertyNames(self.data).forEach(function(key) {
    d3Data.push([averageOfArray(self.data[key]), key])
  })

  //chart.enter().append('circle')
  chart = self.ctx.selectAll('circle')
              .data(d3Data)


  rScale = d3.scale.linear()
             .domain([d3.min(d3Data, function(d) { return d[0] - self.separator }) , d3.max(d3Data, function(d) {  return d[0] + self.separator })])
             .range([0, self.width/self.dataPoints/2])
  intervalLength = self.width/self.dataPoints

  toAll.cx = function (d, i) { return (i+1)*intervalLength - (intervalLength/2) }
  toAll.r = rScale
  toAll.cy = self.width/2 - 10 - 0.5
  toAll.text = function (d, i) { return d[1]+'=>'+Math.floor(d[0]) }

  chart.enter().append('circle')
       .attr('cx', toAll.cx)
       .attr('r', function(d) { return toAll.r(d[0]) })
       .attr('cy', toAll.cy)

  chart.transition()
       .duration(t)
       .attr('r', function(d) { return toAll.r(d[0]) })
       .attr('cx', toAll.cx)

  chart.exit().remove()

  /*
  chart = self.ctx.selectAll('text')
              .data(d3Data)
 
  chart.enter().append('text')
       .attr('x', function (d, i) { return intervalLength*i })
       .attr('y', self.height - 30)
       .attr('dy', '1.2em')
       .attr('dx', intervalLength/2)
       .attr('text-anchor', 'middle')
       .attr('fill', 'steelBlue')
       .text(toAll.text)
       //.attr('opacity', 0)
     .transition()
       .duration(t)
       .attr('x', function (d, i) { return intervalLength * i })
       .attr('dx', intervalLength/2)

  chart.transition()
       .duration(t)
       .attr('x', function (d, i) { return intervalLength*i })
       .attr('dx', intervalLength/2)
       .text(toAll.text)
       //.attr('opacity', 1)

  chart.exit().remove()
  */

  var textOpts = {
    height : self.height
    , width : self.width
    , text : function (d, i) { return d[1]+'->'+Math.floor(d[0]) }
    , transitionTime : self.transitionTime
  }
  drawText(self.ctx, textOpts, d3Data)
       
  /*
  for (var i = 0; i <= 4; i++) {
    self.ctx.append('line')
        .attr('x1', (self.width/4)*i - 0.5)
        .attr('x2', (self.width/4)*i - 0.5)
        .attr('y1', self.height - 0.5)
        .attr('y2', 0.5)
        .attr('stroke', '#000')
  }
  */
       
}

function drawText(ctx, opts, data) {
  if (!opts.height || !opts.width) throw new Error('need height and width')

  var chart
    , intervalLength = opts.intervalLength || (opts.width / data.length)
    , t = opts.transitionTime || 1000

  opts.text = opts.text || String
  chart =  ctx.selectAll('text')
              .data(data)
 
  chart.enter().append('text')
       .attr('x', opts.x || function (d, i) { return intervalLength*i })
       .attr('y', opts.y || (opts.height - 25))
       .attr('dy', opts.dy || '1.2em')
       .attr('dx', opts.dx || (intervalLength/2))
       .attr('text-anchor', opts['text-anchor'] || 'middle')
       .attr('fill', opts.fill || 'steelBlue')
       .text(opts.text)
     .transition()
       .duration(t)
       .attr('x', opts.x || function (d, i) { return intervalLength * i })
       .attr('dx', opts.dx || intervalLength/2)
       .text(opts.text)

  chart.transition()
       .duration(t)
       .attr('x', opts.x || function (d, i) { return intervalLength*i })
       .attr('dx', opts.dx || intervalLength/2)
       .text(opts.text)

  chart.exit().remove()
}


function averageOfArray(arr) {
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + arr[i]
  }
  return sum / arr.length
}


});

require.define("stream",function(require,module,exports,__dirname,__filename,process){var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};
});

require.define("events",function(require,module,exports,__dirname,__filename,process){if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.prototype.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};
});

require.define("util",function(require,module,exports,__dirname,__filename,process){var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.inspect = function(obj, showHidden, depth, colors) {
  var seen = [];

  var stylize = function(str, styleType) {
    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    var styles =
        { 'bold' : [1, 22],
          'italic' : [3, 23],
          'underline' : [4, 24],
          'inverse' : [7, 27],
          'white' : [37, 39],
          'grey' : [90, 39],
          'black' : [30, 39],
          'blue' : [34, 39],
          'cyan' : [36, 39],
          'green' : [32, 39],
          'magenta' : [35, 39],
          'red' : [31, 39],
          'yellow' : [33, 39] };

    var style =
        { 'special': 'cyan',
          'number': 'blue',
          'boolean': 'yellow',
          'undefined': 'grey',
          'null': 'bold',
          'string': 'green',
          'date': 'magenta',
          // "name": intentionally not styling
          'regexp': 'red' }[styleType];

    if (style) {
      return '\033[' + styles[style][0] + 'm' + str +
             '\033[' + styles[style][1] + 'm';
    } else {
      return str;
    }
  };
  if (! colors) {
    stylize = function(str, styleType) { return str; };
  }

  function format(value, recurseTimes) {
    // Provide a hook for user-specified inspect functions.
    // Check that value is an object with an inspect function on it
    if (value && typeof value.inspect === 'function' &&
        // Filter out the util module, it's inspect function is special
        value !== exports &&
        // Also filter out any prototype objects using the circular check.
        !(value.constructor && value.constructor.prototype === value)) {
      return value.inspect(recurseTimes);
    }

    // Primitive types cannot have properties
    switch (typeof value) {
      case 'undefined':
        return stylize('undefined', 'undefined');

      case 'string':
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return stylize(simple, 'string');

      case 'number':
        return stylize('' + value, 'number');

      case 'boolean':
        return stylize('' + value, 'boolean');
    }
    // For some reason typeof null is "object", so special case here.
    if (value === null) {
      return stylize('null', 'null');
    }

    // Look up the keys of the object.
    var visible_keys = Object_keys(value);
    var keys = showHidden ? Object_getOwnPropertyNames(value) : visible_keys;

    // Functions without properties can be shortcutted.
    if (typeof value === 'function' && keys.length === 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        var name = value.name ? ': ' + value.name : '';
        return stylize('[Function' + name + ']', 'special');
      }
    }

    // Dates without properties can be shortcutted
    if (isDate(value) && keys.length === 0) {
      return stylize(value.toUTCString(), 'date');
    }

    var base, type, braces;
    // Determine the object type
    if (isArray(value)) {
      type = 'Array';
      braces = ['[', ']'];
    } else {
      type = 'Object';
      braces = ['{', '}'];
    }

    // Make functions say that they are functions
    if (typeof value === 'function') {
      var n = value.name ? ': ' + value.name : '';
      base = (isRegExp(value)) ? ' ' + value : ' [Function' + n + ']';
    } else {
      base = '';
    }

    // Make dates with properties first say the date
    if (isDate(value)) {
      base = ' ' + value.toUTCString();
    }

    if (keys.length === 0) {
      return braces[0] + base + braces[1];
    }

    if (recurseTimes < 0) {
      if (isRegExp(value)) {
        return stylize('' + value, 'regexp');
      } else {
        return stylize('[Object]', 'special');
      }
    }

    seen.push(value);

    var output = keys.map(function(key) {
      var name, str;
      if (value.__lookupGetter__) {
        if (value.__lookupGetter__(key)) {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Getter/Setter]', 'special');
          } else {
            str = stylize('[Getter]', 'special');
          }
        } else {
          if (value.__lookupSetter__(key)) {
            str = stylize('[Setter]', 'special');
          }
        }
      }
      if (visible_keys.indexOf(key) < 0) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (seen.indexOf(value[key]) < 0) {
          if (recurseTimes === null) {
            str = format(value[key]);
          } else {
            str = format(value[key], recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (isArray(value)) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = stylize('[Circular]', 'special');
        }
      }
      if (typeof name === 'undefined') {
        if (type === 'Array' && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    });

    seen.pop();

    var numLinesEst = 0;
    var length = output.reduce(function(prev, cur) {
      numLinesEst++;
      if (cur.indexOf('\n') >= 0) numLinesEst++;
      return prev + cur.length + 1;
    }, 0);

    if (length > 50) {
      output = braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];

    } else {
      output = braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }

    return output;
  }
  return format(obj, (typeof depth === 'undefined' ? 2 : depth));
};


function isArray(ar) {
  return ar instanceof Array ||
         Array.isArray(ar) ||
         (ar && ar !== Object.prototype && isArray(ar.__proto__));
}


function isRegExp(re) {
  return re instanceof RegExp ||
    (typeof re === 'object' && Object.prototype.toString.call(re) === '[object RegExp]');
}


function isDate(d) {
  if (d instanceof Date) return true;
  if (typeof d !== 'object') return false;
  var properties = Date.prototype && Object_getOwnPropertyNames(Date.prototype);
  var proto = d.__proto__ && Object_getOwnPropertyNames(d.__proto__);
  return JSON.stringify(proto) === JSON.stringify(properties);
}

function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}

exports.log = function (msg) {};

exports.pump = null;

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key);
    return res;
};

var Object_getOwnPropertyNames = Object.getOwnPropertyNames || function (obj) {
    var res = [];
    for (var key in obj) {
        if (Object.hasOwnProperty.call(obj, key)) res.push(key);
    }
    return res;
};

var Object_create = Object.create || function (prototype, properties) {
    // from es5-shim
    var object;
    if (prototype === null) {
        object = { '__proto__' : null };
    }
    else {
        if (typeof prototype !== 'object') {
            throw new TypeError(
                'typeof prototype[' + (typeof prototype) + '] != \'object\''
            );
        }
        var Type = function () {};
        Type.prototype = prototype;
        object = new Type();
        object.__proto__ = prototype;
    }
    if (typeof properties !== 'undefined' && Object.defineProperties) {
        Object.defineProperties(object, properties);
    }
    return object;
};

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object_create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};
});

require.define("/dataStream.js",function(require,module,exports,__dirname,__filename,process){
var Stream = require('stream')
  , util = require('util')
  , http = require('http')
  , jsonURLStream = require('./JSONURLStream.js')

/*
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
*/


function DataStream(opts) {
  if (!(this instanceof DataStream)) return new DataStream(opts)
  if (!opts) throw new Error('url is required for DataStream to do anything useful')

  if (typeof opts === 'string') {
    opts = {url : opts}
    opts.averagingData = false
    opts.averageDataInterval = Infinity
  }

  Stream.call(this)

  this.writable = false
  this.readable = true
  this.paused = true
  this._url = opts.url
  this._req = null
  this._averagingData = opts.averagingData
  this._averageDataInterval = opts.averageDataInterval
  this._buffers = []
  this._averageDataBuf = []

  var intID
  if (this._averagingData) {
    if (!this._averageDataInterval) throw new Error('to take an average of the incoming data, I need an "averageDataInterval"') 
    intID = setInterval(this._clearAverages.bind(this), this._averageDataInterval)
    this.once('end', function() {
      clearInterval(intID)
    })
  }
  if (opts.__test === undefined) this._begin()  //shim to be able to test w/ node.js runtime
  process.nextTick(this.resume.bind(this))
}
util.inherits(DataStream, Stream)

DataStream.prototype._begin = function() {
  var self = this
  self._req = jsonURLStream(self._url)
  self._req.on('data', function(buf) {
    //console.log('res data === ' + buf)
    //console.log('self._buffers.length === ' + self._buffers.length)
    if (self._averagingData) {
      self._averageDataBuf.push(buf)
    } else {
      self._buffers.push(buf)
      self._emitBuffers()
    }
  }) 
  self._req.once('end', function() {
    self.emit('end')
  })

 // http.get({path:self._url}, function(res) {
 //   self._res = res
 //   self._res.on('data', function(buf) {
 //     //console.log('typeof buf in "data" event is: ' + typeof buf)
 //     console.log('res data === ' + buf)
 //     self._buffers = self._buffers.concat(buf.split('\n'))
 //     console.log('self._buffers.length === ' + self._buffers.length)
 //     self._emitBuffers()
 //   }) 

 //   self._res.on('end', function() {
 //     self.emit('end')
 //   })
 // })
}

DataStream.prototype.pause = function() { 
  this.paused = true
}

DataStream.prototype.resume = function() {
  this.paused = false
  //console.log('this is now resumed')
  if (!this._averagingData) this._emitBuffers()
}
DataStream.prototype._emitBuffers = function() {
  var buf
  while (this._buffers.length && !this.paused) {
    buf = this._buffers.shift()
    this.emit('data', buf)
    //console.log('emitting buffer ' + buf)
  }
  //console.log('emmitted buffers')
}

function averageOfArray(arr) {
  for (var i = 0, sum = 0; i < arr.length; i++) {
    sum += 0 + arr[i]
  }
  return sum / arr.length
}

DataStream.prototype._clearAverages = function () {
  var profileTypes = {}
    , i
    , curBuf
    , objProps
    , key
    , curValArr
    , average
  for (i = 0; i < this._averageDataBuf.length; i++) {
    curBuf = this._averageDataBuf[i]
    curBuf = JSON.parse(curBuf)
    if (!profileTypes[curBuf.name]) {
      profileTypes[curBuf.name] = []  //hold all values
      profileTypes[curBuf.name]._original = curBuf
    }
    profileTypes[curBuf.name].push(curBuf.val)
  }
  //why isn't forEach supported by IE :(
  objProps = Object.getOwnPropertyNames(profileTypes) 
  for (i = 0; i < objProps.length; i++) {
    curValArr = profileTypes[objProps[i]]
    average = averageOfArray(curValArr)
    curValArr._original.val = average
    this._buffers.push(JSON.stringify(curValArr._original))
  }
  this._averageDataBuf = []
  this._emitBuffers() 
}


module.exports = DataStream
exports.DataStream = DataStream


});

require.define("http",function(require,module,exports,__dirname,__filename,process){module.exports = require("http-browserify")});

require.define("/node_modules/http-browserify/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {"main":"index.js","browserify":"index.js"}});

require.define("/node_modules/http-browserify/index.js",function(require,module,exports,__dirname,__filename,process){var http = module.exports;
var EventEmitter = require('events').EventEmitter;
var Request = require('./lib/request');

http.request = function (params, cb) {
    if (!params) params = {};
    if (!params.host) params.host = window.location.host.split(':')[0];
    if (!params.port) params.port = window.location.port;
    
    var req = new Request(new xhrHttp, params);
    if (cb) req.on('response', cb);
    return req;
};

http.get = function (params, cb) {
    params.method = 'GET';
    var req = http.request(params, cb);
    req.end();
    return req;
};

http.Agent = function () {};
http.Agent.defaultMaxSockets = 4;

var xhrHttp = (function () {
    if (typeof window === 'undefined') {
        throw new Error('no window object present');
    }
    else if (window.XMLHttpRequest) {
        return window.XMLHttpRequest;
    }
    else if (window.ActiveXObject) {
        var axs = [
            'Msxml2.XMLHTTP.6.0',
            'Msxml2.XMLHTTP.3.0',
            'Microsoft.XMLHTTP'
        ];
        for (var i = 0; i < axs.length; i++) {
            try {
                var ax = new(window.ActiveXObject)(axs[i]);
                return function () {
                    if (ax) {
                        var ax_ = ax;
                        ax = null;
                        return ax_;
                    }
                    else {
                        return new(window.ActiveXObject)(axs[i]);
                    }
                };
            }
            catch (e) {}
        }
        throw new Error('ajax not supported in this browser')
    }
    else {
        throw new Error('ajax not supported in this browser');
    }
})();
});

require.define("/node_modules/http-browserify/lib/request.js",function(require,module,exports,__dirname,__filename,process){var EventEmitter = require('events').EventEmitter;
var Response = require('./response');
var concatStream = require('concat-stream')

var Request = module.exports = function (xhr, params) {
    var self = this;
    self.xhr = xhr;
    self.body = concatStream()
    
    var uri = params.host + ':' + params.port + (params.path || '/');
    
    xhr.open(
        params.method || 'GET',
        (params.scheme || 'http') + '://' + uri,
        true
    );
    
    if (params.headers) {
        Object.keys(params.headers).forEach(function (key) {
            if (!self.isSafeRequestHeader(key)) return;
            var value = params.headers[key];
            if (Array.isArray(value)) {
                value.forEach(function (v) {
                    xhr.setRequestHeader(key, v);
                });
            }
            else xhr.setRequestHeader(key, value)
        });
    }
    
    var res = new Response;
    res.on('ready', function () {
        self.emit('response', res);
    });
    
    xhr.onreadystatechange = function () {
        res.handle(xhr);
    };
};

Request.prototype = new EventEmitter;

Request.prototype.setHeader = function (key, value) {
    if ((Array.isArray && Array.isArray(value))
    || value instanceof Array) {
        for (var i = 0; i < value.length; i++) {
            this.xhr.setRequestHeader(key, value[i]);
        }
    }
    else {
        this.xhr.setRequestHeader(key, value);
    }
};

Request.prototype.write = function (s) {
    this.body.write(s);
};

Request.prototype.end = function (s) {
    if (s !== undefined) this.body.write(s);
    this.body.end()
    this.xhr.send(this.body.getBody());
};

// Taken from http://dxr.mozilla.org/mozilla/mozilla-central/content/base/src/nsXMLHttpRequest.cpp.html
Request.unsafeHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "content-transfer-encoding",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
];

Request.prototype.isSafeRequestHeader = function (headerName) {
    if (!headerName) return false;
    return (Request.unsafeHeaders.indexOf(headerName.toLowerCase()) === -1)
};
});

require.define("/node_modules/http-browserify/lib/response.js",function(require,module,exports,__dirname,__filename,process){var EventEmitter = require('events').EventEmitter;

var Response = module.exports = function (res) {
    this.offset = 0;
};

Response.prototype = new EventEmitter;

var capable = {
    streaming : true,
    status2 : true
};

function parseHeaders (res) {
    var lines = res.getAllResponseHeaders().split(/\r?\n/);
    var headers = {};
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') continue;
        
        var m = line.match(/^([^:]+):\s*(.*)/);
        if (m) {
            var key = m[1].toLowerCase(), value = m[2];
            
            if (headers[key] !== undefined) {
                if ((Array.isArray && Array.isArray(headers[key]))
                || headers[key] instanceof Array) {
                    headers[key].push(value);
                }
                else {
                    headers[key] = [ headers[key], value ];
                }
            }
            else {
                headers[key] = value;
            }
        }
        else {
            headers[line] = true;
        }
    }
    return headers;
}

Response.prototype.getResponse = function (xhr) {
    var respType = xhr.responseType.toLowerCase();
    if (respType === "blob") return xhr.responseBlob;
    if (respType === "arraybuffer") return xhr.response;
    return xhr.responseText;
}

Response.prototype.getHeader = function (key) {
    return this.headers[key.toLowerCase()];
};

Response.prototype.handle = function (res) {
    if (res.readyState === 2 && capable.status2) {
        try {
            this.statusCode = res.status;
            this.headers = parseHeaders(res);
        }
        catch (err) {
            capable.status2 = false;
        }
        
        if (capable.status2) {
            this.emit('ready');
        }
    }
    else if (capable.streaming && res.readyState === 3) {
        try {
            if (!this.statusCode) {
                this.statusCode = res.status;
                this.headers = parseHeaders(res);
                this.emit('ready');
            }
        }
        catch (err) {}
        
        try {
            this.write(res);
        }
        catch (err) {
            capable.streaming = false;
        }
    }
    else if (res.readyState === 4) {
        if (!this.statusCode) {
            this.statusCode = res.status;
            this.emit('ready');
        }
        this.write(res);
        
        if (res.error) {
            this.emit('error', this.getResponse(res));
        }
        else this.emit('end');
    }
};

Response.prototype.write = function (res) {
    var respBody = this.getResponse(res);
    if (respBody.toString().match(/ArrayBuffer/)) {
        this.emit('data', new Uint8Array(respBody, this.offset));
        this.offset = respBody.byteLength;
        return;
    }
    if (respBody.length > this.offset) {
        this.emit('data', respBody.slice(this.offset));
        this.offset = respBody.length;
    }
};
});

require.define("/node_modules/http-browserify/node_modules/concat-stream/package.json",function(require,module,exports,__dirname,__filename,process){module.exports = {}});

require.define("/node_modules/http-browserify/node_modules/concat-stream/index.js",function(require,module,exports,__dirname,__filename,process){var stream = require('stream')
var util = require('util')

function ConcatStream(cb) {
  stream.Stream.call(this)
  this.writable = true
  if (cb) this.cb = cb
  this.body = []
  if (this.cb) this.on('error', cb)
}

util.inherits(ConcatStream, stream.Stream)

ConcatStream.prototype.write = function(chunk) {
  this.body.push(chunk)
}

ConcatStream.prototype.arrayConcat = function(arrs) {
  if (arrs.length === 0) return []
  if (arrs.length === 1) return arrs[0]
  return arrs.reduce(function (a, b) { return a.concat(b) })
}

ConcatStream.prototype.isArray = function(arr) {
  var isArray = Array.isArray(arr)
  var isTypedArray = arr.toString().match(/Array/)
  return isArray || isTypedArray
}

ConcatStream.prototype.getBody = function () {
  if (this.body.length === 0) return
  if (typeof(this.body[0]) === "string") return this.body.join('')
  if (this.isArray(this.body[0])) return this.arrayConcat(this.body)
  if (typeof(Buffer) !== "undefined" && Buffer.isBuffer(this.body[0])) {
    return Buffer.concat(this.body)
  }
  return this.body
}

ConcatStream.prototype.end = function() {
  if (this.cb) this.cb(false, this.getBody())
}

module.exports = function(cb) {
  return new ConcatStream(cb)
}

module.exports.ConcatStream = ConcatStream
});

require.define("/JSONURLStream.js",function(require,module,exports,__dirname,__filename,process){
var util = require('util')
  , Stream = require('stream')

function JSONURLStream(url) {
  if (!(this instanceof JSONURLStream)) return new JSONURLStream(url)
  if (!url) throw new Error('url required')

  Stream.call(this)
  this.readable = true
  this.writable = false
  this.paused = true

  this._buffers = []
  this._place = 0

  this._xhr = new XMLHttpRequest()
  this._xhr.open('GET', url, true)
  this._xhr.send()
  this._xhr.addEventListener('progress', this.xhrProgress.bind(this))

  process.nextTick(this.resume.bind(this)) 
}
util.inherits(JSONURLStream, Stream)

JSONURLStream.prototype.xhrProgress = function(evt) {
  var data = this._xhr.responseText.slice(this._place)
  this._place += data.length
  data = data.split('\n')
  this._buffers = this._buffers.concat(data)
  this._unloadBuffers()
}

JSONURLStream.prototype.pause = function() {
  this.paused = true
}
JSONURLStream.prototype.resume = function() {
  this.paused = false
  this._unloadBuffers()
}
JSONURLStream.prototype._unloadBuffers = function() {
  var buf 
  while (this._buffers.length && !this.paused) {
    buf = this._buffers.shift()
    if (buf.length) this.emit('data', buf)
  }
}

module.exports = JSONURLStream
exports.JSONURLStream = JSONURLStream
});

require.define("/browser-index.js",function(require,module,exports,__dirname,__filename,process){

module.exports = {}

module.exports.graphStream = require('./graphStream.js')
module.exports.dataStream = require('./dataStream.js')
module.exports._util = require('util')

if (window) window.envisage = module.exports
});
require("/browser-index.js");
})();
