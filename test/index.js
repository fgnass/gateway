var gateway = require('../gateway')
  , http = require('http')
  , request = require('supertest')

var middleware = gateway(__dirname, {
  '.php': 'php-cgi',
  '.foo': __dirname + '/non-existing-interpreter'
})

var app = http.createServer(function(req, res) {
  middleware(req, res, function(err) {
    res.writeHead(204, err)
    res.end()
  })
})

describe('gateway()', function() {
  it('should 404', function(done) {
    request(app)
    .get('/no-such-file.php')
    .expect(404)
    .end(done)
  })
  it('should not handle unknown extensions', function(done) {
    request(app)
    .get('/test.bar')
    .expect(204)
    .end(done)
  })
  it('should return 500 if interpreter is not found', function(done) {
    request(app)
    .get('/test.foo')
    .expect(500)
    .end(done)
  })
  it('should pass on the query string', function(done) {
    request(app)
    .get('/echo.php?echo=hello')
    .expect(200)
    .expect('hello')
    .end(done)
  })
  it('should capture the status code', function(done) {
    request(app)
    .get('/status.php')
    .expect(202)
    .end(done)
  })
  it('should set status to 302 upon redirects', function(done) {
    request(app)
    .get('/redirect.php')
    .expect(302)
    .expect('Location', '/status.php')
    .end(done)
  })
  it('should return the body verbatim', function(done) {
    request(app)
    .get('/index.php')
    .expect(200)
    .expect('Content-Type', 'text/plain')
    .expect('Hello\n')
    .end(done)
  })
  it('should serve index files', function(done) {
    request(app)
    .get('/')
    .expect(200)
    .expect('Content-Type', 'text/plain')
    .expect('Hello\n')
    .end(done)
  })
  it('should send a redirect for directories w/o a slash', function(done) {
    request(app)
    .get('/sub')
    .expect(301)
    .expect('Location', '/sub/')
    .end(done)
  })
  it('should serve index files from sub-directories', function(done) {
    request(app)
    .get('/sub/')
    .expect(200)
    .expect('Hello\n')
    .end(done)
  })
})
