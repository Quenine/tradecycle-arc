# Deployment Checklist

## Environment

- [ ] Confirm production environment variables are set.
- [ ] Confirm Arc Testnet RPC and network settings.
- [ ] Confirm contract addresses point to the Arc Testnet deployment.
- [ ] Confirm no private keys, seed phrases, API keys, or local `.env` files are committed.

## Build Checks

- [ ] From repo root, run `npm run compile`.
- [ ] From `/rwa-ui`, run `npm run lint`.
- [ ] From `/rwa-ui`, run `npm run build`.

## Deployment

- [ ] Confirm deployed URL opens.
- [ ] Confirm wallet connection works.
- [ ] Confirm Arc Testnet switching works.
- [ ] Confirm faucet route works.

## Route QA

- [ ] `/`
- [ ] `/demo`
- [ ] `/funding`
- [ ] `/submission`
- [ ] `/market`
- [ ] `/operator`
- [ ] `/operator/dashboard`
- [ ] `/verifier`
- [ ] `/portfolio`
- [ ] `/stats`
- [ ] `/faucet`
- [ ] `/credit-passport`
- [ ] `/credit-passport/[operator]`

## Demo Readiness

- [ ] Confirm at least one real cycle can be opened.
- [ ] Confirm docs links work.
- [ ] Confirm README has final GitHub, demo, and video URLs before submission.
- [ ] Confirm `docs/CIRCLE_PRODUCT_FEEDBACK.md` exists with the exact heading `# Circle Product Feedback`.
- [ ] Confirm no unsupported Circle product is claimed as implemented.
- [ ] Confirm final browser visual QA before recording.
