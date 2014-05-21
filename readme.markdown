# introduction

This document covers how to use [browserify](http://browserify.org) to build
modular applications.

[![cc-by-3.0](http://i.creativecommons.org/l/by/3.0/80x15.png)](http://creativecommons.org/licenses/by/3.0/)

browserify is a tool for compiling
[node-flavored](http://nodejs.org/docs/latest/api/modules.html) commonjs modules
for the browser.

You can use browserify to organize your code and use third-party libraries even
if you don't use [node](http://nodejs.org) itself in any other capacity except
for bundling and installing packages with npm.

The module system that browserify uses is the same as node, so
packages published to [npm](https://npmjs.org) that were originally intended for
use in node but not browsers will work just fine in the browser too.

Increasingly, people are publishing modules to npm which are intentionally
designed to work in both node and in the browser using browserify and many
packages on npm are intended for use in just the browser.
[npm is for all javascript](http://maxogden.com/node-packaged-modules.html),
front or backend alike.

# node packaged modules

Before we can dive too deeply into how to use browserify and how it works, it is
important to first understand how the
[node-flavored version](http://nodejs.org/docs/latest/api/modules.html)
of the commonjs module system works.

## require

In node, there is a `require()` function for loading code from other files.

If you install a module with [npm](https://npmjs.org):

```
npm install uniq
```

Then in a file `nums.js` we can `require('uniq')`:

```
var uniq = require('uniq');
var nums = [ 5, 2, 1, 3, 2, 5, 4, 2, 0, 1 ];
console.log(uniq(nums));
```

The output of this program when run with node is:

```
$ node nums.js
[ 0, 1, 2, 3, 4, 5 ]
```

You can require relative files by requiring a string that starts with a `.`. For
example, to load a file `foo.js` from `main.js`, in `main.js` you can do:

``` js
var foo = require('./foo.js');
console.log(foo(4));
```

If `foo.js` was in the parent directory, you could use `../foo.js` instead:

``` js
var foo = require('../foo.js');
console.log(foo(4));
```

or likewise for any other kind of relative path. Relative paths are always
resolved with respect to the invoking file's location.

Note that `require()` returned a function and we assigned that return value to a
variable called `uniq`. We could have picked any other name and it would have
worked the same. `require()` returns the exports of the module name that you
specify.

How `require()` works is unlike many other module systems where imports are akin
to statements that expose themselves as globals or file-local lexicals with
names declared in the module itself outside of your control. Under the node
style of code import with `require()`, someone reading your program can easily
tell where each piece of functionality came from. This approach scales much
better as the number of modules in an application grows.

## exports

To export a single thing from a file so that other files may import it, assign
over the value at `module.exports`:

``` js
module.exports = function (n) {
    return n * 111
};
```

Now when some module `main.js` loads your `foo.js`, the return value of
`require('./foo.js')` will be the exported function:

``` js
var foo = require('./foo.js');
console.log(foo(5));
```

This program will print:

```
555
```

You can export any kind of value with `module.exports`, not just functions.

For example, this is perfectly fine:

``` js
module.exports = 555
```

and so is this:

``` js
var numbers = [];
for (var i = 0; i < 100; i++) numbers.push(i);

module.exports = numbers;
```

There is another form of doing exports specifically for exporting items onto an
object. Here, `exports` is used instead of `module.exports`:

``` js
exports.beep = function (n) { return n * 1000 }
exports.boop = 555
```

This program is the same as:

``` js
module.exports.beep = function (n) { return n * 1000 }
module.exports.boop = 555
```

because `module.exports` is the same as `exports` and is initially set to an
empty object.

Note however that you can't do:

``` js
// this doesn't work
exports = function (n) { return n * 1000 }
```

because the export value lives on the `module` object, and so assigning a new
value for `exports` instead of `module.exports` masks the original reference. 

Instead if you are going to export a single item, always do:

``` js
// instead
module.exports = function (n) { return n * 1000 }
```

If you're still confused, try to understand how modules work in
the background:

``` js
var module = {
  exports: {}
};

// If you require a module, it's basically wrapped in a function
(function(module, exports) {
  exports = function (n) { return n * 1000 };
}(module, module.exports))

console.log(module.exports); // it's still an empty object :(
```

Most of the time, you will want to export a single function or constructor with
`module.exports` because it's usually best for a module to do one thing.

The `exports` feature was originally the primary way of exporting functionality
and `module.exports` was an afterthought, but `module.exports` proved to be much
more useful in practice at being more direct, clear, and avoiding duplication.

In the early days, this style used to be much more common:

foo.js:

``` js
exports.foo = function (n) { return n * 111 }
```

main.js:

``` js
var foo = require('./foo.js');
console.log(foo.foo(5));
```

but note that the `foo.foo` is a bit superfluous. Using `module.exports` it
becomes more clear:

foo.js:

``` js
module.exports = function (n) { return n * 111 }
```

main.js:

``` js
var foo = require('./foo.js');
console.log(foo(5));
```

## bundling for the browser

To run a module in node, you've got to start from somewhere.

In node you pass a file to the `node` command to run a file:

```
$ node robot.js
beep boop
```

In browserify, you do this same thing, but instead of running the file, you
generate a stream of concatenated javascript files on stdout that you can write
to a file with the `>` operator:

```
$ browserify robot.js > bundle.js
```

Now `bundle.js` contains all the javascript that `robot.js` needs to work.
Just plop it into a single script tag in some html:

``` html
<html>
  <body>
    <script src="bundle.js"></script>
  </body>
</html>
```

Bonus: if you put your script tag right before the `</body>`, you can use all of
the dom elements on the page without waiting for a dom onready event.

There are many more things you can do with bundling. Check out the bundling
section elsewhere in this document.

## how browserify works

Browserify starts at the entry point files that you give it and searches for any
`require()` calls it finds using
[static analysis](http://npmjs.org/package/detective)
of the source code's
[abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree).

For every `require()` call with a string in it, browserify resolves those module
strings to file paths and then searches those file paths for `require()` calls
recursively until the entire dependency graph is visited.

Each file is concatenated into a single javascript file with a minimal
`require()` definition that maps the statically-resolved names to internal IDs.

This means that the bundle you generate is completely self-contained and has
everything your application needs to work with a pretty negligible overhead.

For more details about how browserify works, check out the compiler pipeline
section of this document.

## why concatenate

Browserify is a build step that runs on the server. It generates a single bundle
file that has everything in it.

Here are some other ways of implementing module systems for the browser and what
their strengths and weaknesses are:

### window globals

Instead of a module system, each file defines properties on the window global
object or develops an internal namespacing scheme.

This approach does not scale well without extreme diligence since each new file
needs an additional `<script>` tag in all of the html pages where the
application will be rendered. Further, the files tend to be very order-sensitive
because some files need to be included before other files the expect globals to
already be present in the environment.

It can be difficult to refactor or maintain applications built this way.
On the plus side, all browsers natively support this approach and no server-side
tooling is required.

This approach tends to be very slow since each `<script>` tag initiates a
new round-trip http request.

### concatenate

Instead of window globals, all the scripts are concatenated beforehand on the
server. The code is still order-sensitive and difficult to maintain, but loads
much faster because only a single http request for a single `<script>` tag needs
to execute.

Without source maps, exceptions thrown will have offsets that can't be easily
mapped back to their original files.

### AMD

Instead of using `<script>` tags, every file is wrapped with a `define()`
function and callback. [This is AMD](http://requirejs.org/docs/whyamd.html). 

The first argument is an array of modules to load that maps to each argument
supplied to the callback. Once all the modules are loaded, the callback fires.

``` js
define(['jquery'] , function ($) {
    return function () {};
});
```

You can give your module a name in the first argument so that other modules can
include it.

There is a commonjs sugar syntax that stringifies each callback and scans it for
`require()` calls
[with a regexp](https://github.com/jrburke/requirejs/blob/master/require.js#L17).

Code written this way is much less order-sensitive than concatenation or globals
since the order is resolved by explicit dependency information.

For performance reasons, most of the time AMD is bundled server-side into a
single file and during development it is more common to actually use the
asynchronous feature of AMD.

### bundling commonjs server-side

If you're going to have a build step for performance and a sugar syntax for
convenience, why not scrap the whole AMD business altogether and bundle
commonjs? With tooling you can resolve modules to address order-sensitivity and
your development and production environments will be much more similar and less
fragile. The CJS syntax is nicer and the ecosystem is exploding because of node
and npm.

You can seamlessly share code between node and the browser. You just need a
build step and some tooling for source maps and auto-rebuilding.

Plus, we can use node's module lookup algorithms to save us from version
mismatch insanity so that we can have multiple conflicting versions of different
required packages in the same application and everything will still work.

# development

Concatenation has some downsides, but these can be very adequately addressed
with development tooling.

## source maps

Browserify supports a `--debug`/`-d` flag and `opts.debug` parameter to enable
source maps. Source maps tell the browser to convert line and column offsets for
exceptions thrown in the bundle file back into the offsets and filenames of the
original sources.

## auto-recompile

Running a command to recompile your bundle every time can be slow and tedious.
Luckily there are many tools to solve this problem.

### [watchify](https://npmjs.org/package/watchify)

You can use `watchify` interchangeably with `browserify` but instead of writing
to an output file once, watchify will write the bundle file and then watch all
of the files in your dependency graph for changes. When you modify a file, the
new bundle file will be written much more quickly than the first time because of
aggressive caching.

You can use `-v` to print a message every time a new bundle is written:

```
$ watchify browser.js -d -o static/bundle.js -v
610598 bytes written to static/bundle.js  0.23s
610606 bytes written to static/bundle.js  0.10s
610597 bytes written to static/bundle.js  0.14s
610606 bytes written to static/bundle.js  0.08s
610597 bytes written to static/bundle.js  0.08s
610597 bytes written to static/bundle.js  0.19s
```

Here is a handy configuration for using watchify and browserify with the
package.json "scripts" field:

``` json
{
  "build": "browserify browser.js -o static/bundle.js",
  "watch": "watchify browser.js -o static/bundle.js --debug --verbose",
}
```

To build the bundle for production do `npm run build` and to watch files for
during development do `npm run watch`.

[Learn more about `npm run`](http://substack.net/task_automation_with_npm_run).

### [beefy](https://www.npmjs.org/package/beefy)

If you would rather spin up a web server that automatically recompiles your code
when you modify it, check out [beefy](http://didact.us/beefy/).

Just give beefy an entry file:

```
beefy main.js
```

and it will set up shop on an http port.

### browserify-middleware, enchilada

If you are using express, check out
[browserify-middleware](https://www.npmjs.org/package/browserify-middleware)
or [enchilada](https://www.npmjs.org/package/enchilada).

They both provide middleware you can drop into an express application for
serving browserify bundles.

## using the api directly

You can just use the API directly from an ordinary `http.createServer()` for
development too:

``` js
var browserify = require('browserify');
var http = require('http');

http.createServer(function (req, res) {
    if (req.url === '/bundle.js') {
        res.setHeader('content-type', 'application/javascript');
        var b = browserify(__dirname + '/main.js').bundle();
        b.on('error', console.error);
        b.pipe(res);
    }
    else res.writeHead(404, 'not found')
});
```

## grunt

If you use grunt, you'll probably want to use the
[grunt-browserify](https://www.npmjs.org/package/grunt-browserify) plugin.

## gulp

If you use gulp, you should use the browserify API directly.

Here is
[a guide for getting started](http://viget.com/extend/gulp-browserify-starter-faq)
with gulp and browserify.

# builtins

In order to make more npm modules originally written for node work in the
browser, browserify provides many browser-specific implementations of node core
libraries:

* [assert](https://npmjs.org/package/assert)
* [buffer](https://npmjs.org/package/buffer)
* [console](https://npmjs.org/package/console-browserify)
* [constants](https://npmjs.org/package/constants-browserify)
* [crypto](https://npmjs.org/package/crypto-browserify)
* [domain](https://npmjs.org/package/domain-browser)
* [events](https://npmjs.org/package/events-browserify)
* [http](https://npmjs.org/package/http-browserify)
* [https](https://npmjs.org/package/https-browserify)
* [os](https://npmjs.org/package/os-browserify)
* [path](https://npmjs.org/package/path-browserify)
* [punycode](https://npmjs.org/package/punycode)
* [querystring](https://npmjs.org/package/querystring)
* [stream](https://npmjs.org/package/stream-browserify)
* [string_decoder](https://npmjs.org/package/string_decoder)
* [timers](https://npmjs.org/package/timers-browserify)
* [tty](https://npmjs.org/package/tty-browserify)
* [url](https://npmjs.org/package/url)
* [util](https://npmjs.org/package/util)
* [vm](https://npmjs.org/package/vm-browserify)
* [zlib](https://npmjs.org/package/browserify-zlib)

events, stream, url, path, and querystring are particularly useful in a browser
environment.

Additionally, if browserify detects the use of `Buffer`, `process`, `global`,
`__filename`, or `__dirname`, it will include a browser-appropriate definition.

So even if a module does a lot of buffer and stream operations, it will probably
just work in the browser, so long as it doesn't do any server IO.

If you haven't done any node before, here are some examples of what each of
those globals can do. Note too that these globals are only actually defined when
you or some module you depend on uses them.

## [Buffer](http://nodejs.org/docs/latest/api/buffer.html)

In node all the file and network APIs deal with Buffer chunks. In browserify the
Buffer API is provided by [buffer](https://www.npmjs.org/package/buffer), which
uses augmented typed arrays in a very performant way with fallbacks for old
browsers.

Here's an example of using `Buffer` to convert a base64 string to hex:

```
var buf = Buffer('YmVlcCBib29w', 'base64');
var hex = buf.toString('hex');
console.log(hex);
```

This example will print:

```
6265657020626f6f70
```

## [process](http://nodejs.org/docs/latest/api/process.html#process_process)

In node, `process` is a special object that handles information and control for
the running process such as environment, signals, and standard IO streams.

Of particular consequence is the `process.nextTick()` implementation that
interfaces with the event loop.

In browserify the process implementation is handled by the
[process module](https://www.npmjs.org/package/process) which just provides
`process.nextTick()` and little else.

Here's what `process.nextTick()` does:

```
setTimeout(function () {
    console.log('third');
}, 0);

process.nextTick(function () {
    console.log('second');
});

console.log('first');
```

This script will output:

```
first
second
third
```

`process.nextTick(fn)` is like `setTimeout(fn, 0)`, but faster because
`setTimeout` is artificially slower in javascript engines for compatibility reasons.

## [global](http://nodejs.org/docs/latest/api/all.html#all_global)

In node, `global` is the top-level scope where global variables are attached
similar to how `window` works in the browser. In browserify, `global` is just an
alias for the `window` object.

## [__filename](http://nodejs.org/docs/latest/api/all.html#all_filename)

`__filename` is the path to the current file, which is different for each file.

To prevent disclosing system path information, this path is rooted at the
`opts.basedir` that you pass to `browserify()`, which defaults to the
[current working directory](https://en.wikipedia.org/wiki/Current_working_directory).

If we have a `main.js`:

``` js
var bar = require('./foo/bar.js');

console.log('here in main.js, __filename is:', __filename);
bar();
```

and a `foo/bar.js`:

``` js
module.exports = function () {
    console.log('here in foo/bar.js, __filename is:', __filename);
};
```

then running browserify starting at `main.js` gives this output:

```
$ browserify main.js | node
here in main.js, __filename is: /main.js
here in foo/bar.js, __filename is: /foo/bar.js
```

## [__dirname](http://nodejs.org/docs/latest/api/all.html#all_dirname)

`__dirname` is the directory of the current file. Like `__filename`, `__dirname`
is rooted at the `opts.basedir`.

Here's an example of how `__dirname` works:

main.js:

``` js
require('./x/y/z/abc.js');
console.log('in main.js __dirname=' + __dirname);
```

x/y/z/abc.js:

``` js
console.log('in abc.js, __dirname=' + __dirname);
```

output:

```
$ browserify main.js | node
in abc.js, __dirname=/x/y/z
in main.js __dirname=/
```

# transforms

Instead of browserify baking in support for everything, it supports a flexible
transform system that are used to convert source files in-place.

This way you can `require()` files written in coffee script or templates and
everything will be compiled down to javascript.

To use [coffeescript](http://coffeescript.org/) for example, you can use the
[coffeeify](https://www.npmjs.org/package/coffeeify) transform.
Make sure you've installed coffeeify first with `npm install coffeeify` then do:

```
$ browserify -t coffeeify main.coffee > bundle.js
```

or with the API you can do:

```
var b = browserify('main.coffee');
b.transform('coffeeify');
```

The best part is, if you have source maps enabled with `--debug` or
`opts.debug`, the bundle.js will map exceptions back into the original coffee
script source files. This is very handy for debugging with firebug or chrome
inspector.

## writing your own

Transforms implement a simple streaming interface. Here is a transform that
replaces `$CWD` with the `process.cwd()`:

``` js
var through = require('through2');

module.exports = function (file) {
    return through(function (buf, enc, next) {
        this.push(buf.toString('utf8').replace(/\$CWD/g, process.cwd());
        next();
    });
};
```

The transform function fires for every `file` in the current package and returns
a transform stream that performs the conversion. The stream is written to and by
browserify with the original file contents and browserify reads from the stream
to obtain the new contents.

Simply save your transform to a file or make a package and then add it with
`-t ./your_transform.js`.

For more information about how streams work, check out the
[stream handbook](https://github.com/substack/stream-handbook).

# package.json

## browser field

You can define a `"browser"` field in the package.json of any package that will
tell browserify to override lookups for the main field and for individual
modules.

If you have a module with a main entry point of `main.js` for node but have a
browser-specific entry point at `browser.js`, you can do:

``` json
{
  "name": "mypkg",
  "version": "1.2.3",
  "main": "main.js",
  "browser": "browser.js"
}
```

Now when somebody does `require('mypkg')` in node, they will get the exports
from `main.js`, but when they do `require('mypkg')` in a browser, they will get
the exports from `browser.js`.

Splitting up whether you are in the browser or not with a `"browser"` field in
this way is greatly preferrable to checking whether you are in a browser at
runtime because you may want to load different modules based on whether you are
in node or the browser. If the `require()` calls for both node and the browser
are in the same file, browserify's static analysis will include everything
whether you use those files or not.

You can do more with the "browser" field as an object instead of a string.

For example, if you only want to swap out a single file in `lib/` with a
browser-specific version, you could do:

``` json
{
  "name": "mypkg",
  "version": "1.2.3",
  "main": "main.js",
  "browser": {
    "lib/foo.js": "lib/browser-foo.js"
  }
}
```

or if you want to swap out a module used locally in the package, you can do:

``` json
{
  "name": "mypkg",
  "version": "1.2.3",
  "main": "main.js",
  "browser": {
    "fs": "level-fs-browser"
  }
}
```

You can ignore files (setting their contents to the empty object) by setting
their values in the browser field to `false`:

``` json
{
  "name": "mypkg",
  "version": "1.2.3",
  "main": "main.js",
  "browser": {
    "winston": false
  }
}
```

The browser field *only* applies to the current package. Any mappings you put
will not propagate down to its dependencies or up to its dependents. This
isolation is designed to protect modules from each other so that when you
require a module you won't need to worry about any system-wide effects it might
have. Likewise, you shouldn't need to wory about how your local configuration
might adversely affect modules far away deep into your dependency graph.

## browserify.transform field

You can configure transforms to be automatically applied when a module is loaded
in a package's `browserify.transform` field. For example, we can automatically
apply the [brfs](https://npmjs.org/package/brfs) transform with this
package.json:

``` json
{
  "name": "mypkg",
  "version": "1.2.3",
  "main": "main.js",
  "browserify": {
    "transform": [ "brfs" ]
  }
}
```

Now in our `main.js` we can do:

``` js
var fs = require('fs');
var src = fs.readFileSync(__dirname + '/foo.txt', 'utf8');

module.exports = function (x) { return src.replace(x, 'zzz') };
```

and the `fs.readFileSync()` call will be inlined by brfs without consumers of
the module having to know. You can apply as many transforms as you like in the
transform array and they will be applied in order.

Like the `"browser"` field, transforms configured in package.json will only
apply to the local package for the same reasons.

# finding good modules

Here are [some useful heuristics](http://substack.net/finding_modules)
for finding good modules on npm that work in the browser:

* I can install it with npm

* code snippet on the readme using require() - from a quick glance I should see
how to integrate the library into what I'm presently working on

* has a very clear, narrow idea about scope and purpose

* knows when to delegate to other libraries - doesn't try to do too many things itself

* written or maintained by authors whose opinions about software scope,
modularity, and interfaces I generally agree with (often a faster shortcut
than reading the code/docs very closely)

* inspecting which modules depend on the library I'm evaluating - this is baked
into the package page for modules published to npm

Other metrics like number of stars on github, project activity, or a slick
landing page, are not as reliable.

## module philosophy

People used to think that exporting a bunch of handy utility-style things would
be the main way that programmers would consume code because that is the primary
way of exporting and importing code on most other platforms and indeed still
persists even on npm.

However, this
[kitchen-sink mentality](https://github.com/substack/node-mkdirp/issues/17)
toward including a bunch of thematically-related but separable functionality
into a single package appears to be an artifact for the difficulty of
publishing and discovery in a pre-github, pre-npm era.

There are two other big problems with modules that try to export a bunch of
functionality all in one place under the auspices of convenience: demarcation
turf wars and finding which modules do what.

Packages that are grab-bags of features
[waste a ton of time policing boundaries](https://github.com/jashkenas/underscore/search?q=special-case&ref=cmdform&type=Issues)
about which new features belong and don't belong.
There is no clear natural boundary of the problem domain in this kind of package
about what the scope is, it's all
[somebody's smug opinion](http://david.heinemeierhansson.com/2012/rails-is-omakase.html).

Node, npm, and browserify are not that. They are avowedly ala-carte,
participatory, and would rather celebrate disagreement and the dizzying
proliferation of new ideas and approaches than try to clamp down in the name of
conformity, standards, or "best practices".

Nobody who needs to do gaussian blur ever thinks "hmm I guess I'll start checking
generic mathematics, statistics, image processing, and utility libraries to see
which one has gaussian blur in it. Was it stats2 or image-pack-utils or
maths-extra or maybe underscore has that one?"
No. None of this. Stop it. They `npm search gaussian` and they immediately see
[ndarray-gaussian-filter](https://npmjs.org/package/ndarray-gaussian-filter) and
it does exactly what they want and then they continue on with their actual
problem instead of getting lost in the weeds of somebody's neglected grand
utility fiefdom.

# organizing modules

## avoiding ../../../../../../..

Not everything in an application properly belongs on the public npm and the
overhead of setting up a private npm or git repo is still rather large in many
cases. Here are some approaches for avoiding the `../../../../../../../`
relative paths problem.

### node_modules

People sometimes object to putting application-specific modules into
node_modules because it is not obvious how to check in your internal modules
without also checking in third-party modules from npm.

The answer is quite simple! If you have a `.gitignore` file that ignores
`node_modules`:

```
node_modules
```

You can just add an exception with `!` for each of your internal application
modules:

```
node_modules/*
!node_modules/foo
!node_modules/bar
```

Please note that you can't *unignore* a subdirectory,
if the parent is already ignored. So instead of ignoring `node_modules`,
you have to ignore every directory *inside* `node_modules` with the 
`node_modules/*` trick, and then you can add your exceptions.

Now anywhere in your application you will be able to `require('foo')` or
`require('bar')` without having a very large and fragile relative path.

If you have a lot of modules and want to keep them more separate from the
third-party modules installed by npm, you can just put them all under a
directory in `node_modules` such as `node_modules/app`:

```
node_modules/app/foo
node_modules/app/bar
```

Now you will be able to `require('app/foo')` or `require('app/bar')` from
anywhere in your application.

In your `.gitignore`, just add an exception for `node_modules/app`:

```
node_modules/*
!node_modules/app
```

### symlink

Another handy trick if you are working on an application where you can make
symlinks and don't need to support windows is to symlink a `lib/` or `app/`
folder into `node_modules`. From the project root, do:

```
ln -s ../lib node_modules/app
```

and now from anywhere in your project you'll be able to require files in `lib/`
by doing `require('app/foo.js')` to get `lib/foo.js`.

### custom paths

You might see some places talk about using the `$NODE_PATH` environment variable
or `opts.paths` to add directories for node and browserify to look in to find
modules.

Unlike most other platforms, using a shell-style array of path directories with
`$NODE_PATH` is not as favorable in node compared to making effective use of the
`node_modules` directory.

This is because your application is more tightly coupled to a runtime
environment configuration so there are more moving parts and your application
will only work when your environment is setup correctly.

node and browserify both support but discourage the use of `$NODE_PATH`.

## non-javascript assets

There are many
[browserify transforms](https://github.com/substack/node-browserify/wiki/browserify-transforms)
you can use to do many things. Commonly, transforms are used to include
non-javascript assets into bundle files.

### brfs

One way of including any kind of asset that works in both node and the browser
is brfs.

brfs uses static analysis to compile the results of `fs.readFile()` and
`fs.readFileSync()` calls down to source contents at compile time.

For example, this `main.js`:

``` js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/robot.html', 'utf8');
console.log(html);
```

applied through brfs would become something like:

```
var fs = require('fs');
var html = "<b>beep boop</b>";
console.log(html);
```

when run through brfs.

### hbsify

### jadeify

### reactify

## reusable components

Putting these ideas about code organization together, we can build a reusable UI
component that we can reuse across our application or in other applications.

Here is a bare-bones example of an empty widget module:

``` js
module.exports = Widget;

function Widget (opts) {
    if (!(this instanceof Widget)) return new Widget(opts);
    this.element = document.createElement('div');
}

Widget.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    target.appendChild(this.element);
};
```

Handy javascript constructor tip: you can include a `this instanceof Widget`
check like above to let people consume your module with `new Widget` or
`Widget()`. It's nice because it hides an implementation detail from your API
and you still get the performance benefits and indentation wins of using
prototypes.

To use this widget, just use `require()` to load the widget file, instantiate
it, and then call `.appendTo()` with a css selector string or a dom element.

Like this:

``` js
var Widget = require('./widget.js');
var w = Widget();
w.appendTo('#container');
```

and now your widget will be appended to the DOM.

Creating HTML elements procedurally is fine for very simple content but gets
very verbose and unclear for anything bigger. Luckily there are many transforms
available to ease importing HTML into your javascript modules.

Let's extend our widget example using [brfs](https://npmjs.org/package/brfs). We
can also use [domify](https://npmjs.org/package/domify) to turn the string that
`fs.readFileSync()` returns into an html dom element:

``` js
var fs = require('fs');
var domify = require('domify');

var html = fs.readFileSync(__dirname + '/widget.html', 'utf8');

module.exports = Widget;

function Widget (opts) {
    if (!(this instanceof Widget)) return new Widget(opts);
    this.element = domify(html);
}

Widget.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    target.appendChild(this.element);
};
```

and now our widget will load a `widget.html`, so let's make one:

``` html
<div class="widget">
  <h1 class="name"></h1>
  <div class="msg"></div>
</div>
```

It's often useful to emit events. Here's how we can emit events using the
built-in `events` module and the [inherits](https://npmjs.org/package/inherits)
module:

``` js
var fs = require('fs');
var domify = require('domify');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

var html = fs.readFileSync(__dirname + '/widget.html', 'utf8');

inherits(Widget, EventEmitter);
module.exports = Widget;

function Widget (opts) {
    if (!(this instanceof Widget)) return new Widget(opts);
    this.element = domify(html);
}

Widget.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    target.appendChild(this.element);
    this.emit('append', target);
};
```

Now we can listen for `'append'` events on our widget instance:

``` js
var Widget = require('./widget.js');
var w = Widget();
w.on('append', function (target) {
    console.log('appended to: ' + target.outerHTML);
});
w.appendTo('#container');
```

We can add more methods to our widget to set elements on the html:

``` js
var fs = require('fs');
var domify = require('domify');
var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

var html = fs.readFileSync(__dirname + '/widget.html', 'utf8');

inherits(Widget, EventEmitter);
module.exports = Widget;

function Widget (opts) {
    if (!(this instanceof Widget)) return new Widget(opts);
    this.element = domify(html);
}

Widget.prototype.appendTo = function (target) {
    if (typeof target === 'string') target = document.querySelector(target);
    target.appendChild(this.element);
};

Widget.prototype.setName = function (name) {
    this.element.querySelector('.name').textContent = name;
}

Widget.prototype.setMessage = function (msg) {
    this.element.querySelector('.msg').textContent = msg;
}
```

If setting element attributes and content gets too verbose, check out
[hyperglue](https://npmjs.org/package/hyperglue).

Now finally, we can toss our `widget.js` and `widget.html` into
`node_modules/app-widget`. Since our widget uses the
[brfs](https://npmjs.org/package/brfs) transform, we can create a `package.json`
with:

``` json
{
  "name": "app-widget",
  "version": "1.0.0",
  "private": true,
  "browserify": {
    "transform": [ "brfs" ]
  },
  "dependencies": {
    "brfs": "^1.1.1",
    "inherits": "^2.0.1"
  }
}
```

And now whenever we `require('app-widget')` from anywhere in our application,
brfs will be applied to our `widget.js` automatically!
Our widget can even maintain its own dependencies. This way we can update
dependencies in one widgets without worrying about breaking changes cascading
over into other widgets.

Make sure to add an exclusion in your `.gitignore` for
`node_modules/app-widget`:

```
node_modules/*
!node_modules/app-widget
```

You can read more about [shared rendering in node and the
browser](http://substack.net/shared_rendering_in_node_and_the_browser) if you
want to learn about sharing rendering logic between node and the browser using
browserify and some streaming html libraries.

# testing in node and the browser

Testing modular code is very easy! One of the biggest benefits of modularity is
that your interfaces become much easier to instantiate in isolation and so it's
easy to make automated tests.

Unfortunately, few testing libraries play nicely out of the box with modules and
tend to roll their own idiosyncratic interfaces with implicit globals and obtuse
flow control that get in the way of a clean design with good separation.

People also make a huge fuss about "mocking" but it's usually not necessary if
you design your modules with testing in mind. Keeping IO separate from your
algorithms, carefully restricting the scope of your module, and accepting
callback parameters for different interfaces can all make your code much easier
to test.

For example, if you have a library that does both IO and speaks a protocol,
[consider separating the IO layer from the
protocol](https://www.youtube.com/watch?v=g5ewQEuXjsQ#t=12m30)
using an interface like [streams](https://github.com/substack/stream-handbook).

Your code will be easier to test and reusable in different contexts that you
didn't initially envision. This is a recurring theme of testing: if your code is
hard to test, it is probably not modular enough or contains the wrong balance of
abstractions. Testing should not be an afterthought, it should inform your
whole design and it will help you to write better interfaces.

## testing libraries

### [tape](https://npmjs.org/package/tape)

Tape was specifically designed from the start to work well in both node and
browserify. Suppose we have an `index.js` with an async interface:

``` js
module.exports = function (x, cb) {
    setTimeout(function () {
        cb(x * 100);
    }, 1000);
};
```

Here's how we can test this module using [tape](https://npmjs.org/package/tape). 
Let's put this file in `test/beep.js`:

``` js
var test = require('tape');
var hundreder = require('../');

test('beep', function (t) {
    t.plan(1);
    
    hundreder(5, function (n) {
        t.equal(n, 500, '5*100 === 500');
    });
});
```

Because the test file lives in `test/`, we can require the `index.js` in the
parent directory by doing `require('../')`. `index.js` is the default place that
node and browserify look for a module if there is no package.json in that
directory with a `main` field.

We can `require()` tape like any other library after it has been installed with
`npm install tape`.

The string `'beep'` is an optional name for the test.
The 3rd argument to `t.equal()` is a completely optional description.

The `t.plan(1)` says that we expect 1 assertion. If there are not enough
assertions or too many, the test will fail. An assertion is a comparison
like `t.equal()`. tape has assertion primitives for:

* t.equal(a, b) - compare a and b strictly with `===`
* t.deepEqual(a, b) - compare a and b recursively
* t.ok(x) - fail if `x` is not truthy

and more! You can always add an additional description argument.

Running our module is very simple! To run the module in node, just run
`node test/beep.js`:

```
$ node test/beep.js
TAP version 13
# beep
ok 1 5*100 === 500

1..1
# tests 1
# pass  1

# ok
```

The output is printed to stdout and the exit code is 0.

To run our code in the browser, just do:

```
$ browserify test/beep.js > bundle.js
```

then plop `bundle.js` into a `<script>` tag:

```
<script src="bundle.js"></script>
```

and load that html in a browser. The output will be in the debug console which
you can open with F12, ctrl-shift-j, or ctrl-shift-k depending on the browser.

This is a bit cumbersome to run our tests in a browser, but you can install the
`testling` command to help. First do:

```
npm install -g testling
```

And now just do `browserify test/beep.js | testling`:

```
$ browserify test/beep.js | testling

TAP version 13
# beep
ok 1 5*100 === 500

1..1
# tests 1
# pass  1

# ok
```

`testling` will launch a real browser headlessly on your system to run the tests.

Now suppose we want to add another file, `test/boop.js`:

``` js
var test = require('tape');
var hundreder = require('../');

test('fraction', function (t) {
    t.plan(1);

    hundreder(1/20, function (n) {
        t.equal(n, 5, '1/20th of 100');
    });
});

test('negative', function (t) {
    t.plan(1);

    hundreder(-3, function (n) {
        t.equal(n, -300, 'negative number');
    });
});
```

Here our test has 2 `test()` blocks. The second test block won't start to
execute until the first is completely finished, even though it is asynchronous.
You can even nest test blocks by using `t.test()`.

We can run `test/boop.js` with node directly as with `test/beep.js`, but if we
want to run both tests, there is a minimal command-runner we can use that comes
with tape. To get the `tape` command do:

```
npm install -g tape
```

and now you can run:

```
$ tape test/*.js
TAP version 13
# beep
ok 1 5*100 === 500
# fraction
ok 2 1/20th of 100
# negative
ok 3 negative number

1..3
# tests 3
# pass  3

# ok
```

and you can just pass `test/*.js` to browserify to run your tests in the
browser:

```
$ browserify test/* | testling

TAP version 13
# beep
ok 1 5*100 === 500
# fraction
ok 2 1/20th of 100
# negative
ok 3 negative number

1..3
# tests 3
# pass  3

# ok
```

Putting together all these steps, we can configure `package.json` with a test
script:

``` json
{
  "name": "hundreder",
  "version": "1.0.0",
  "main": "index.js",
  "devDependencies": {
    "tape": "^2.13.1",
    "testling": "^1.6.1"
  },
  "scripts": {
    "test": "tape test/*.js",
    "test-browser": "browserify test/*.js | testlingify"
  }
}
```

Now you can do `npm test` to run the tests in node and `npm run test-browser` to
run the tests in the browser. You don't need to worry about installing commands
with `-g` when you use `npm run`: npm automatically sets up the `$PATH` for all
packages installed locally to the project.

If you have some tests that only run in node and some tests that only run in the
browser, you could have subdirectories in `test/` such as `test/server` and
`test/browser` with the tests that run both places just in `test/`. Then you
could just add the relevant directory to the globs:

``` json
{
  "name": "hundreder",
  "version": "1.0.0",
  "main": "index.js",
  "devDependencies": {
    "tape": "^2.13.1",
    "testling": "^1.6.1"
  },
  "scripts": {
    "test": "tape test/*.js test/server/*.js",
    "test-browser": "browserify test/*.js test/browser/*.js | testlingify"
  }
}
```

and now server-specific and browser-specific tests will be run in addition to
the common tests.

If you want something even slicker, check out
[prova](https://www.npmjs.org/package/prova) once you have gotten the basic
concepts.

### assert

The core assert module is a fine way to write simple tests too, although it can
sometimes be tricky to ensure that the correct number of callbacks have fired.

You can solve that problem with tools like
[macgyver](https://www.npmjs.org/package/macgyver) but it is appropriately DIY.

### mocha


## code coverage

## testling-ci

# bundling

## standalone

## external bundles

## ignoring and excluding

In browserify parlance, "ignore" means: replace the definition of a module with
an empty object. "exclude" means: remove a module completely from a dependency graph.

Another way to achieve many of the same goals as ignore and exclude is the
"browser" field in package.json, which is covered elsewhere in this document.

### ignoring

Ignoring is an optimistic strategy designed to stub in an empty definition for
node-specific modules that are only used in some codepaths. For example, if a
module requires a library that only works in node but for a specific chunk of
the code:

``` js
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

exports.convert = convert;
function convert (src) {
    return src.replace(/beep/g, 'boop');
}

exports.write = function (src, dst, cb) {
    fs.readFile(src, function (err, src) {
        if (err) return cb(err);
        mkdirp(path.dirname(dst), function (err) {
            if (err) return cb(err);
            var out = convert(src);
            fs.writeFile(dst, out, cb);
        });
    });
};
```

browserify already "ignores" the `'fs'` module by returning an empty object, but
the `.write()` function here won't work in the browser without an extra step like
a static analysis transform or a runtime storage fs abstraction.

However, if we really want the `convert()` function but don't want to see
`mkdirp` in the final bundle, we can ignore mkdirp with `b.ignore('mkdirp')` or
`browserify --ignore mkdirp`. The code will still work in the browser if we
don't call `write()` because `require('mkdirp')` won't throw an exception, just
return an empty object.

Generally speaking it's not a good idea for modules that are primarily
algorithmic (parsers, formatters) to do IO themselves but these tricks can let
you use those modules in the browser anyway.

To ignore `foo` on the command-line do:

```
browserify --ignore foo
```

To ignore `foo` from the api with some bundle instance `b` do:

``` js
b.ignore('foo')
```

### excluding

Another related thing we might want is to completely remove a module from the
output so that `require('modulename')` will fail at runtime. This is useful if
we want to split things up into multiple bundles that will defer in a cascade to
previously-defined `require()` definitions.

For example, if we have a vendored standalone bundle for jquery that we don't want to appear in
the primary bundle:

```
$ npm install jquery
$ browserify -r jquery --standalone jquery > jquery-bundle.js
```

then we want to just `require('jquery')` in a `main.js`:

``` js
var $ = require('jquery');
$(window).click(function () { document.body.bgColor = 'red' });
```

defering to the jquery dist bundle so that we can write:

``` html
<script src="jquery-bundle.js"></script>
<script src="bundle.js"></script>
```

and not have the jquery definition show up in `bundle.js`, then while compiling
the `main.js`, you can `--exclude jquery`:

```
browserify main.js --exclude jquery > bundle.js
```

To exclude `foo` on the command-line do:

```
browserify --exclude foo
```

To exclude `foo` from the api with some bundle instance `b` do:

``` js
b.exclude('foo')
```

## browserify cdn

# compiler pipeline

## module-deps

## browser-pack

## insert-module-globals

## build your own browserify

## browser-unpack

## plugins
