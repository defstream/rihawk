# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.3.x   | yes       |
| < 0.3   | no        |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately via
[GitHub security advisories](https://github.com/defstream/rihawk/security/advisories/new)
rather than public issues. Reports are acknowledged on a best-effort basis —
this is a small, single-maintainer project.

## Scope notes

- rihawk's only runtime dependency is [no-riak](https://github.com/oleksiyk/no-riak),
  which is unmaintained; vulnerabilities inside it may require vendoring or
  replacement rather than an upstream fix.
- Riak KV itself is community-maintained (OpenRiak). Operate it on trusted
  networks; rihawk supports no-riak's TLS `auth` option for authenticated
  clusters.
