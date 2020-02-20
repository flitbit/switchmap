# switchmap

An independent SwitchMap, inspired by RxJs, for Nodejs and Javascript.

> About a year ago I wrote one of these in a Javascript codebase for the day job; but I've been jonesing for something similar in the open-source community, so I decided to write another - this time in Typescript. I hope it is useful to others.

## Getting Started

In your shell:

```bash
npm install switchmap
```

In your module:

```ts
import { SwitchMap } from 'switchmap';
```

## Composable Switch/Case Statements

`SwitchMap` provides a simple semantic for composing a dispatch table when routing is based on some aspect of the items themselves.
