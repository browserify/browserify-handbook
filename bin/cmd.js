#!/usr/bin/env node

var fs = require('fs');
var pager = require('default-pager');
var through = require('through2');
var duplexer = require('duplexer2');
var concat = require('concat-stream');
var marked = require('marked');
var MarkedTerminal = require('marked-terminal');

marked.setOptions({
    renderer: new MarkedTerminal()
});

var moutput = through();
var minput = concat({ encoding: 'string' }, function (res) {
    moutput.end(marked(res));
});
var markdown = duplexer(minput, moutput);

fs.createReadStream(__dirname + '/../readme.markdown')
  .pipe(markdown)
  .pipe(pager());
