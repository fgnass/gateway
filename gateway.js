var fs = require('fs')
  , url = require('url')
  , parse = url.parse
  , path = require('path')
  , extname = path.extname
  , normalize = path.normalize
  , join = path.join
  , spawn = require('child_process').spawn
  , statusExp = /^Status:\s*(\d{3}) (.*)$/i

module.exports = function cgi(docroot, options) {
  if (!docroot) throw new Error('gateway() requires docroot')
  if (!options) options = {
    '.php': 'php-cgi'
  }

  return function layer(req, res, next) {
    var url = parse(req.url)
      , path = url.pathname
      , handler = options[extname(path)]

    if (!next) next = function() { res.end() }
    if (!handler) return next()

    var script = normalize(join(docroot, path))

    // Sanity check
    if (script.indexOf(docroot) !== 0
      || ~script.indexOf('\0')
      || ~script.indexOf('..')
      || !fs.existsSync(script)) return next()


    var host = (req.headers.host || '').split(':')
      , hostName = host[0]
      , port = host[1]

    if ((!hostName || !port) && typeof(this.address) === 'function') {
      var addr = this.address()
      if (!hostName) hostName = addr.address
      if (!port) port = addr.port
    }

    var env = {
      __proto__: options.env || {},
      PATH: process.env.PATH,
      GATEWAY_INTERFACE: 'CGI/1.1',
      SERVER_PROTOCOL: 'HTTP/1.1',
      SERVER_ROOT: docroot,
      DOCUMENT_ROOT: docroot,
      SERVER_NAME: hostName,
      SERVER_PORT: port || 80,
      HTTPS: req.connection.encrypted ? 'On' : 'Off',
      REDIRECT_STATUS: 200,
      SCRIPT_NAME: path,
      REQUEST_URI: path,
      SCRIPT_FILENAME: script,
      PATH_TRANSLATED: script,
      REQUEST_METHOD: req.method,
      QUERY_STRING: url.query || ''
    }

    // Expose request headers
    for (var header in req.headers) {
      var name = 'HTTP_' + header.toUpperCase().replace(/-/g, '_')
      env[name] = req.headers[header]
    }

    var child = spawn(handler, [], {
      'env': env
    })

    req.pipe(child.stdin)
    if (options.stderr) child.stderr.pipe(options.stderr)

    var body
      , line = []
      , statusCode
      , reason

    child.stdout.on('data', function(buf) {
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
    })
    child.on('close', res.end)
  }

}
