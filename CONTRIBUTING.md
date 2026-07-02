# Contributing to react-allauth

Thanks for taking the time to contribute! This guide covers the local setup
and the conventions the project follows.

## Prerequisites

- Node.js 20 or newer (CI runs on 20 and 22).
- Docker, if you want to run the playground backend.
- [pre-commit](https://pre-commit.com/), for the git hooks.

## Setup

```sh
git clone https://github.com/alexandre-petitjean/react-allauth.git
cd react-allauth
npm install
pre-commit install
```

`pre-commit install` enables the hooks (ESLint, type-check, whitespace) on
every commit.

## Scripts

| Script                  | Description                                |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Run the playground app (Vite, with HMR)    |
| `npm run build`         | Build the library (ESM + CJS + type defs)  |
| `npm run test`          | Run the test suite with Vitest             |
| `npm run test:watch`    | Run the test suite in watch mode           |
| `npm run test:coverage` | Run the tests with the coverage gate       |
| `npm run test:e2e`      | Run the Playwright e2e suite (see below)   |
| `npm run lint`          | Lint the source with ESLint                |
| `npm run typecheck`     | Type-check the project with TypeScript     |

## Playground

The playground is a small Vite app backed by a real django-allauth server:

```sh
cd playground/backend && docker compose up   # backend on :8000
npm run dev                                  # front on :5173
```

See [`playground/README.md`](./playground/README.md) for details.

The e2e suite (`npm run test:e2e`) drives this same stack: the backend and
Mailpit must be up via docker compose; Playwright starts the Vite dev server
itself.

## Testing conventions

- Tests use Vitest, Testing Library and MSW, and live next to the code they
  cover (`src/hooks/useAuth.test.tsx` for `src/hooks/useAuth.ts`).
- The shared MSW server is set up in `src/test/setup.ts`; override handlers
  per test with `server.use(...)` instead of editing the defaults.
- New code must keep the coverage thresholds in `vitest.config.ts` green:
  run `npm run test:coverage` before pushing.

## Pull requests

- CI must be green: lint, typecheck, tests with coverage, build.
- Write single-line, imperative commit messages ("Add X", "Fix Y").
- User-visible changes get a CHANGELOG entry under the relevant
  Keep a Changelog section (Added / Changed / Fixed / Removed).
- Breaking changes are acceptable during `0.x` but must be called out — see
  [VERSIONING.md](./VERSIONING.md).

## Security issues

Do not open a public issue for vulnerabilities — follow
[SECURITY.md](./SECURITY.md).
