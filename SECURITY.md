# Security Policy

`react-allauth` is an authentication library. Security reports are taken
seriously and handled with priority.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub Security Advisories — the preferred channel:

➡️ [Report a vulnerability](https://github.com/alexandre-petitjean/react-allauth/security/advisories/new)

If you cannot use GitHub Advisories, email **petitjean.alexandre.pro@gmail.com**
with the details. Please include:

- a description of the issue and its impact,
- the affected version,
- steps to reproduce or a proof of concept.

## Response targets

| Stage                    | Target                          |
| ------------------------ | ------------------------------- |
| Acknowledgement          | within 72 hours                 |
| Initial assessment       | within 7 days                   |
| Fix (or mitigation plan) | within 30 days                  |

We will keep you informed throughout, and credit you in the advisory unless you
prefer to stay anonymous.

## Supported versions

While the project is in its `0.x` phase, **only the latest released version**
receives security fixes (see [VERSIONING.md](./VERSIONING.md)). After `1.0.0`,
security fixes will target the latest MAJOR release.

| Version | Supported |
| ------- | --------- |
| latest `0.x` | ✅ |
| older `0.x`  | ❌ |

## Threat model

Read the [threat model](./docs/threat-model.md) to understand exactly what this
library does and does not protect against before relying on it.
