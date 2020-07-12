# switchmap

[![CircleCI](https://circleci.com/gh/flitbit/switchmap/tree/master.svg?style=svg)](https://circleci.com/gh/flitbit/switchmap/tree/master)[![codecov](https://codecov.io/gh/flitbit/switchmap/branch/master/graph/badge.svg)](https://codecov.io/gh/flitbit/switchmap)

An independent SwitchMap, inspired by RxJs, for Nodejs and Javascript.

> About a year ago I wrote one of these in a Javascript codebase for the day job; but I've been jonesing for something similar in the open-source community, so I decided to write another - this time in Typescript. I hope it is useful to others.

## Use

```ts
// examples/version.ts
// $ npx ts-node examples/version.ts

import { SwitchMap } from '../dist';

interface Message {
  version?: string;
  data: string;
}
type Handler = (message: Message) => void;

const versions: Record<string, Handler> = {
  init: ({ data }) => console.log(`${data}`),
  pre1: ({ version, data }) => console.log(`got ${version}: ${data}`),
  v1x: ({ version, data }) => console.log(`${version}: ${data}`),
  v2x: ({ version, data }) => console.log(`received ${version}: ${data}`),
  unrecognized: ({ version }) => console.log(`unsupported: ${version}`),
};

const dispatch = new SwitchMap((m: Message) => m.version || '0')
  .value('0', versions.init)
  .value('0.7', versions.pre1)
  .match(/^1\.[0-7]$/, versions.v1x)
  .value(['2.0', '2.1'], versions.v2x)
  .default(versions.unrecognized);

dispatch.push({ data: 'blah blah' });
// blah blah

dispatch.push({ version: '1.1', data: 'blah blah' });
// 1.1: blah blah

dispatch.push({ version: '2.1', data: 'blah blah' });
// received 2.1: blah blah

dispatch.push({ version: '3.1', data: 'blah blah' });
// unsupported: 3.1
```

## Install

In your shell:

```bash
npm install switchmap
```

## Import

In your module:

```ts
import { SwitchMap } from 'switchmap';
```

## API Documentation

The [API documentation is generated from code by typedoc and hosted here](http://flitbit.github.io/switchmap/classes/_src_index_.switchmap.html). Read the docs.

Documentation is always a work in progress, let us know by creating an issue if you need a scenario documented.

## License

[MIT](https://github.com/flitbit/switchmap/blob/master/LICENSE)
