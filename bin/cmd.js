#!/usr/bin/env node

var fs = require('fs');
var pager = require('default-pager');
var obj = require('through2').obj;
var msee = require('msee');

fs.createReadStream(__dirname + '/../readme.markdown')
  .pipe(obj(function (chunk, enc, cb) {
    this.push(msee.parse(chunk.toString()))
  }))
  .pipe(pager());
