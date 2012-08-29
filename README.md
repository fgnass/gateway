# gateway

## Node.js middleware to execute CGI scripts

Purpose of this module is to allow development tools like
[Yeoman](http://yeoman.io) or [Livestyle](https://github.com/One-com/livestyle)
to serve PHP files (and possibly other scripting languages) directly.

To make this work you need the `php-cgi` binaray in your PATH.

## Usage

```javascript
var http = require('http');
var gateway = require('gateway');

var app = http.createServer(gateway(__dirname, {
  '.php': 'php-cgi'
}))
```

## Installing php-cgi

The `php-cgi` binary can be installed via Homebrew by tapping the
[homebrew-php](https://github.com/josegonzalez/homebrew-php) repository:

    brew tap homebrew/dupes
    brew tap josegonzalez/homebrew-php
    brew install php54

Alternatively you can also use one of these scripts:

* [php-build](http://chh.github.com/php-build/) which is used by [Travis CI](http://travis-ci.org/)
* [phpbrew](https://github.com/c9s/phpbrew)

## Note

The gateway middleware doesn't support `cgi-bin` directories. If you want to
serve CGI scripts with a shebang please use [node-cgi](https://github.com/TooTallNate/node-cgi) instead.

## License

(The MIT License)

Copyright (c) 2012 Felix Gnass

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
