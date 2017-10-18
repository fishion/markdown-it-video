'use strict';

var path = require('path');
var generate = require('markdown-it-testgen');

describe('markdown-it-video', function() {
  var md = require('markdown-it')({
    html: true,
    linkify: true,
    typography: true
  }).use(require('../'));
  generate(path.join(__dirname, 'fixtures/video.txt'), md);
});

describe('markdown-it-video options', function() {
  var md = require('markdown-it')({
    html: true,
    linkify: true,
    typography: true
  }).use(require('../index.js'), {
    'plainiframe' : true
  });
  generate(path.join(__dirname, 'fixtures/video_options.txt'), md);
});
