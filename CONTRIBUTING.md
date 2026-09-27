# Contributing to SSHDeck

Thanks for helping improve SSHDeck. Bug reports, documentation improvements,
tests, and pull requests are welcome.

## Contribution workflow

1. Fork the repository and create a descriptive branch: `feature/<name>`,
   `fix/<name>`, `docs/<name>`, or `test/<name>`.
2. Keep credentials, private keys, host data, and local configuration out of
   commits. `.sshdeck/`, `.env*`, and generated exports are intentionally
   ignored.
3. Run the full quality suite before opening a pull request:

   ```bash
   npm run typecheck
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

4. Use a concise conventional commit message, such as
   `feat: add server export` or `fix: preserve terminal resize`.
5. Open a pull request explaining the problem, the solution, and how you tested
   it.

## Security-sensitive changes

Changes involving authentication, SSH arguments, configuration persistence, or
credentials must preserve the security invariants in `AGENTS.md`. In
particular, never store passwords in `config.json` or disable SSH host-key
checking.

## Branch policy

The default branch is protected: changes should arrive through pull requests,
require a passing CI run, and require review when collaborators are available.
