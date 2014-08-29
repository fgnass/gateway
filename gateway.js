var fs = require('fs')
  , URL = require('url')
  , path = require('path')
  , extname = path.extname
  , normalize = path.normalize
  , join = path.join
  , spawn = require('child_process').spawn
  , statusExp = /^Status:\s*(\d{3}) (.*)$/i


module.exports = function gateway(docroot, options) {

  // docroot is required
  if (!docroot) throw new Error('gateway(...) requires a docroot')

  docroot = normalize(docroot)

  // default mapping
  if (!options) options = {
    '.php': 'php-cgi'
  }

  // extract options starting with a dot
  var exts = Object.keys(options).filter(function(o) { return o[0] == '.'})

  function isMalicious(path) {
    return path.indexOf(docroot) !== 0
      || ~path.indexOf('\0')
      || ~path.indexOf('..')
  }

  return function (req, res, next) {

    function error(code, reason, headers) {
      res.writeHead(code || 500, reason, headers)
      res.end()
    }

    var url = URL.parse(req.url)
      , originalUrl = req.originalUrl ? URL.parse(req.originalUrl) : url
      , path = normalize(join(docroot, url.pathname))

    req.pause()

    // look for index.* files
    resolveIndexFiles(path, exts, function(file, stat) {

      // file does not exist
      if (!file) {
        if (options[extname(path)]) {
          // ... but a handler is registered for the extension
          res.writeHead(404)
          return res.end()
        }
        return next()
      }

      // sanity check
      if (isMalicious(file)) return error(403)

      // redirect if a directory was requested w/o trailing slash
      if (stat.isDirectory()) {
        url.pathname += '/'
        return error(301, '', {'Location': URL.format(url) })
      }

      // look up handler by extenion
      var handler = options[extname(file)]
      if (!handler) return next()

      // populate the environment
      var host = (req.headers.host || '').split(':')
      var env = {
        __proto__: options.env || {},
        PATH: process.env.PATH,
        GATEWAY_INTERFACE: 'CGI/1.1',
        SERVER_PROTOCOL: 'HTTP/1.1',
        SERVER_ROOT: docroot,
        DOCUMENT_ROOT: docroot,
        SERVER_NAME: host[0],
        SERVER_PORT: host[1] || 80,
        HTTPS: req.connection.encrypted ? 'On' : 'Off',
        REDIRECT_STATUS: 200,
        SCRIPT_NAME: originalUrl.pathname,
        REQUEST_URI: originalUrl.path,
        SCRIPT_FILENAME: file,
        PATH_TRANSLATED: file,
        REQUEST_METHOD: req.method,
        QUERY_STRING: url.query || '',
        REMOTE_ADDR: req.connection.remoteAddress,
        SERVER_SOFTWARE: options['.php']
      }

      // expose request headers
      for (var header in req.headers) {
        var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_')
        env[name] = req.headers[header]
      }

      if ('content-length' in req.headers)
        env.CONTENT_LENGTH = req.headers['content-length']

      if ('content-type' in req.headers)
        env.CONTENT_TYPE = req.headers['content-type']

      var body
        , line = []
        , statusCode
        , reason
        , exit
        , end

      function done() {
        if (exit === undefined || !end) return
        if (exit && !body) error(500, handler + ' exited with code ' + exit)
        else res.end()
      }

      var cmd = handler
        , args = []

      if (handler instanceof Array) {
        cmd = handler[0]
        args = handler.slice(1)
      }

      var child = spawn(cmd, args, {
        'env': env
      })
      .on('error', function(err) {
        exit = -1
        done()
      })
      .on('exit', function(code) {
        exit = code
        done()
      })

      child.stdout
        .on('end', function() {
          end = true
          done()
        })
        .on('data', function(buf) {
          if (body) return res.write(buf)

          for (var i=0; i < buf.length; i++) {
            var c = buf[i]
            if (c == 0xA) {
              if (!line.length) {
                body = true
                res.writeHead(statusCode || 200, reason)
                res.write(buf.slice(i+1))
                return
              }

              var s = line.join('')
              line = []
              if (!statusCode) {
                var m = statusExp.exec(s)
                if (m) {
                  statusCode = m[1]
                  reason = m[2]
                  continue
                }
              }
              var idx = s.indexOf(':')
              res.setHeader(s.slice(0, idx), s.slice(idx+1).trim())
            }
            else if (c != 0xD) {
              line.push(String.fromCharCode(c))
            }
          }
        }
      )

      req.pipe(child.stdin)
      req.resume()
      if (options.stderr) child.stderr.pipe(options.stderr)

    })
  }
}

// If path ends with a slash look for index files
function resolveIndexFiles(path, exts, cb) {
  var files = path[path.length-1] == '/'
    ? exts.map(function(ext) { return path + 'index' + ext })
    : [path]

  var i = 0
  , file

  function next(err, stat) {
    if (stat) return cb(file, stat)
    file = files[i++]

    if (file) fs.stat(file, next)
    else cb()
  }
  next()
}
