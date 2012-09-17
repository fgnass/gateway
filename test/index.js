var gateway = require('../gateway')
  , http = require('http')
  , request = require('supertest')

var options = {
  '.php': 'php-cgi',
  '.sh': __dirname + '/cgi.sh',
  '.foo': __dirname + '/non-existing-interpreter'
}

var middleware = gateway(__dirname + '/htdocs', options)

var app = http.createServer(function(req, res) {
  middleware(req, res, function(err) {
    res.writeHead(204, err)
    res.end()
  })
})

describe('shell', test('sh'))
describe('php', test('php'))

function test(ext) {
  return function() {

    it('should 404', function(done) {
      request(app)
      .get('/no-such-file.' + ext)
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
      var query = 'echo=hello'
      request(app)
      .get('/echo.' + ext + '?' + query)
      .expect(200)
      .expect(query)
      .end(done)
    })
    it('should capture the status code', function(done) {
      request(app)
      .get('/status.' + ext)
      .expect(202)
      .end(done)
    })
    it('should set status to 302 upon redirects', function(done) {
      request(app)
      .get('/redirect.' + ext)
      .expect(302)
      .expect('Location', '/status.php')
      .end(done)
    })
    it('should return the body verbatim', function(done) {
      request(app)
      .get('/hello.' + ext)
      .expect(200)
      .expect('Content-Type', 'text/plain')
      .expect('Hello\n')
      .end(done)
    })
    it('should echo post params', function(done) {
      request(app)
      .post('/post.' + ext)
      .type('form')
      .send({foo: 'Hello'})
      .expect(200)
      .expect('foo=Hello\n')
      .end(done)
    })
    it('should send a redirect for directories w/o a slash', function(done) {
      request(app)
      .get('/' + ext)
      .expect(301)
      .expect('Location', '/' + ext + '/')
      .end(done)
    })
    it('should serve index files', function(done) {
      request(app)
      .get('/' + ext + '/')
      .expect(200)
      .expect('Hello\n')
      .end(done)
    })
  }
}
