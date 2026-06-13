# react-allauth

React components and hooks for the [django-allauth](https://docs.allauth.org/) headless API.

> [!NOTE]
> This package is under active development. The public API is not stable yet.

## Installation

```sh
npm install react-allauth
```

`react` and `react-dom` are peer dependencies (React 18 or 19):

```sh
npm install react react-dom
```

## Usage

```ts
import {} from 'react-allauth'
```

The public surface is currently empty and will grow as components and hooks
are implemented.

## Development

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `npm run build`     | Build the library (ESM + CJS + type defs)    |
| `npm run test`      | Run the test suite with Vitest               |
| `npm run test:watch`| Run the test suite in watch mode             |
| `npm run lint`      | Lint the source with ESLint                  |
| `npm run typecheck` | Type-check the project with TypeScript       |

Enable the git hooks once after cloning (lint, type-check, whitespace):

```sh
pre-commit install
```

Continuous integration (lint, type-check, test, build on Node 20 & 22) runs on
every pull request. Publishing is automated: pushing a `v*` tag triggers
`npm publish` from CI, which requires an `NPM_TOKEN` repository secret.

## License

[MIT](./LICENSE)
