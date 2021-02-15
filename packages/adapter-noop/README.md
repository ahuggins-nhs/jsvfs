# JSVFS Adapter: No-op

The default adapter for `jsvfs`. Useful for testing or for using `jsvfs` purely in-memory with no access to persistent storage.

If you're looking to use `jsvfs`, it's probably best to start with `@jsvfs/core`.

This module is the default noop backend for `jsvfs` and already imported if you have installed `@jsvfs/core`.

If you're looking to create new adapters, please use `@jsvfs/types` and look to `@jsvfs/adapter-node-fs` as an example.

## Installation

Get it from npm:
```shell
npm install --save @jsvfs/adapter-noop
```

## Documentation

Complete documentation of `jsvfs` can be found at the [jsvfs site](https://ahuggins-nhs.github.io/jsvfs/).
