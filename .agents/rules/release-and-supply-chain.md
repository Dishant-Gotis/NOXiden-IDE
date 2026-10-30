---
trigger: model_decision
description: Apply when changing CI/CD, dependencies, build configuration, installers, code signing, automatic updates, release artifacts, or public distribution.
---

# Release and Software Supply-Chain Rules

## Supported platforms and release proof

- Target Windows, macOS, and Linux, but define supported OS versions and release formats explicitly. Build and smoke-test real packages on each supported platform.
- Treat installer generation, signing/notarization, update feed, update signature verification, rollback/recovery, uninstall behavior, and release notes as production features.
- Do not embed signing keys or long-lived release credentials in the repository. Use minimal-permission CI identities and protected secrets; prefer short-lived identity federation where supported.
- Never describe unsigned builds as fully trusted. Explain platform-specific trust and notarization limitations honestly.
- Release artifacts should have checksums and a documented version. Add SBOMs and build provenance/attestations as release maturity and ecosystem support allow.

## CI/CD and dependency hygiene

- Run formatting, linting, type checks, unit/integration tests, vulnerability/dependency/license checks, and platform builds appropriate to the change.
- Pin third-party CI actions to immutable full commit SHAs or an approved lockfile mechanism where available. Grant workflows least-privilege tokens and scope release secrets only to trusted release workflows.
- Keep lockfiles and dependency updates reviewed. Prefer maintained dependencies and document exceptions for abandoned or high-risk packages.
- Verify license and notice obligations for direct and transitive dependencies, model weights, datasets, bundled binaries, fonts, icons, and extension components before redistribution.
- Produce a Software Bill of Materials for public releases when practical and establish a vulnerability-reporting process.

## Versioning, updates, and rollback

- Define the product version source of truth and release compatibility policy. Keep app version, update metadata, and release notes consistent.
- Updates must be authenticated and integrity-checked. Failed or interrupted update flows must leave the application recoverable.
- Test upgrade, downgrade/rollback policy, user-data preservation, and migrations. Never silently remove user data during an update or uninstall.
- Keep update infrastructure optional and replaceable where practical; do not create an unreviewed mandatory cloud dependency.

## Hosted services are conditional

- Do not create Kubernetes, container orchestration, centralized telemetry, or service SLO documents unless the chosen architecture actually operates those services. Record a justified decision when a hosted component is introduced.
