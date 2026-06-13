# Versioning policy

`react-allauth` follows [Semantic Versioning](https://semver.org/).

## Current phase: `0.x`

The library is in its `0.x` phase: the public API is still being shaped and is
**not yet stable**. While in `0.x`:

- **Breaking changes may land in any `0.x.y` release** and are always documented
  in the [CHANGELOG](./CHANGELOG.md).
- New features and fixes are released as patch bumps (`0.1.0` → `0.1.1`).
- Pin a version (or use `~0.1.0`) if you need stability between installs.

This trade-off is intentional: the cost of locking in the API before it has been
proven against real-world usage is higher than the cost of the `0.x` signal.

## Reaching `1.0.0`

The library will be promoted to `1.0.0` only once **all** of the planned hooks —
auth, password, emails, MFA, WebAuthn, social, sessions and config — are
implemented, tested, and the API has been stable through at least one real-world
adoption cycle.

After `1.0.0`, standard semver applies:

- **MAJOR** (`2.0.0`) — incompatible API changes.
- **MINOR** (`1.1.0`) — backwards-compatible features.
- **PATCH** (`1.0.1`) — backwards-compatible fixes.

## Deprecation process

From `1.0.0` onward, before anything is removed:

1. It is marked `@deprecated` in the type definitions, with the recommended
   replacement, in a MINOR release.
2. It keeps working for at least one subsequent MINOR release.
3. It is removed only in the next MAJOR release.

During `0.x`, deprecations are noted in the CHANGELOG but may be removed faster.

## Support window

- Only the latest released version receives fixes during `0.x`.
- After `1.0.0`, security fixes target the latest MAJOR; see
  [SECURITY.md](./SECURITY.md) for the supported-versions policy.
