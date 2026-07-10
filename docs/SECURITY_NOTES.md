# Security Notes

## Audit Status

Root package production audit:

- `npm audit --omit=dev` found 0 vulnerabilities.

UI package audit:

- `npm audit fix` was run inside `/rwa-ui` without `--force`.
- The lockfile received safe dependency resolution updates without changing direct dependency ranges in `package.json`.
- Remaining UI advisories are upstream dependency-chain issues around wallet/build packages.

## Remaining UI Advisories

`npm audit fix --force` was intentionally not run because it would force breaking upgrades or downgrades, including Wagmi/RainbowKit wallet-stack changes and unsafe Next.js resolution changes.

This is a testnet demo. A production release would include a planned wallet-stack dependency upgrade, audit review of upstream wallet packages, and wallet regression testing across the supported connectors.
