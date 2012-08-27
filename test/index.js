var gateway = require('../gateway')
  , http = require('http')
  , request = require('supertest')
  , app = http.createServer(gateway(__dirname, {
    '.php': 'php-cgi',
    '.foo': __dirname + '/non-existing-interpreter'
  }))

describe('gateway()', function() {
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
    .get('/text.php')
    .expect(200)
    .expect('Content-Type', 'text/plain')
    .expect('Plain Text Response\n')
    .end(done)
  })
  it('should return 500 if interpreter is not found', function(done) {
    request(app)
    .get('/test.foo')
    .expect(500)
    .end(done)
  })
})
