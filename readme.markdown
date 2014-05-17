# intro

# node packaged modules

## require

### how node_modules works

## module.exports

# development

## source maps

## npm run build

## using the api directly

## watchify

## beefy

## browserify-middleware

## grunt

## gulp

# builtins

# transforms

## using from the command-line

## using from the api

## writing your own

## global transforms

# package.json

## browser field

## browserify.transform field

# finding good modules

Here are some useful heuristics for finding good modules on npm that work in the
browser:

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
node_modules
!node_modules/foo
!node_modules/bar
```

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
node_modules
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
environemtn configuration so there are more moving parts and your application
will only work when your environment is setup correctly.

node and browserify both support but discourage the use of `$NODE_PATH`.

## reusable components

## non-javascript assets

### brfs

### hbsify

### jadeify

## publishing

# testing in node and the browser

## tape

## mocha

## code coverage

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

```
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');

exports.convert = convert;
function convert (src) {
    return src.replace(/beep/boop/g);
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

```
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

```
var $ = require('jquery');
$(window).click(function () { document.body.bgColor = 'red' });
```

defering to the jquery dist bundle so that we can write:

```
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

```
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
