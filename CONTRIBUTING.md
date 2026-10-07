# Contributing

Thanks for helping. This project has a few firm rules, because the tools are only useful if people can trust them.

## Rules

1. **Local means local.** A tool marked LOCAL never sends user data anywhere. No analytics, tracking, ads or third-party scripts, ever.
2. **No fake limits or numbers.** No quotas, paywalls, watermarks or invented usage counts. Real limits are documented on the tool page.
3. **Never alter data silently.** If a result differs from the input in a way the user didn't ask for, the result says so.
4. **₹0 to run.** The site stays a static export; no server, database or paid service.
5. **Accessible by default.** Keyboard, screen reader labels, 320 px screens, AA contrast.

## Workflow

1. Open an issue first for a new tool, so we can agree on scope.
2. Branch from `main`, make the change, and follow [docs/tool-development.md](docs/tool-development.md) for tools.
3. Run `npm run verify:static`, `npm run test:browser` and, for UI or file-handling changes, `npm run test:cross-browser` (after `npx playwright install chromium firefox webkit`).
4. Open a pull request using the template. CI must pass.

## Style

TypeScript strict, Prettier (`npm run format`), ESLint. Match the existing structure: engines are pure, workspaces use the shared components, user-facing text is plain and specific.

## Dependencies

Only when a tool can't reasonably do without one. It must be permissively licensed, small, maintained, pinned to an exact version, and credited in the tool's `dependencies`.

By contributing you agree your work is released under the [MIT licence](LICENSE) and that you'll follow the [Code of Conduct](CODE_OF_CONDUCT.md).
