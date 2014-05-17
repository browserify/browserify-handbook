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
overhead of setting up a private npm repo is still rather large.

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

### custom paths

You might see some places talk about using the `$NODE_PATH

This works but has some important limitations to be aware of:

* whenever you run your code with node or browserify, your environment


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

Ignoring is an optimistic strategy designed to stub in an empty definition for
node-specific modules that are only used in some codepaths. For example, if a
module requires a library that 

Another way to achieve many of the same 

### ignoring in the api

### excluding in the api

### ignoring in the command-line

### excluding in the command-line

## browserify cdn

# compiler pipeline

## module-deps

## browser-pack

## insert-module-globals

## build your own browserify

## browser-unpack

## plugins
