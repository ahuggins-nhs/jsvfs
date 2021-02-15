# JSVFS Adapter: Node fs

The official adapter supporting Node's `fs` module as a back-end for `jsvfs`.

Allows a developer to define the current working directory that acts as the root of the adapter, and to enable the
`flush` functionality of the adapter. This second option is important, as flush in this adapter attempts to completely
remove all files and folders from the root of the adapter. To protect developers against accidentally destroying files,
this option defaults to `false` and must be intentionally enabled.

If you're looking to create new adapters, please use `@jsvfs/types` and look to this module as an example.

## Installation

Get it from npm:
```shell
npm install --save @jsvfs/adapter-node-fs
```

## Documentation

Complete documentation of `jsvfs` can be found at the [jsvfs site](https://ahuggins-nhs.github.io/jsvfs/).
