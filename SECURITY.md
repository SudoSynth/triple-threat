# Security Policy

Thanks for helping keep Triple Threat and its users safe.

## Supported versions

Triple Threat is pre-1.0. Only the latest tagged release receives security updates — no LTS branches, no backports.

| Version | Supported |
|---|---|
| Latest tagged release | ✅ |
| All earlier releases | ❌ |

## Reporting a vulnerability

Use **GitHub's private vulnerability reporting**:

1. Go to <https://github.com/SudoSynth/triple-threat/security/advisories>
2. Click **Report a vulnerability**
3. Fill in the disclosure form

This sends the report directly and privately to the maintainer; nothing is public until the issue is resolved.

> **Pre-public note**: This repo is currently private. Private vulnerability reporting (PVR) becomes available when the repo goes public. Until then, if you have access to the repo and find an issue, open a draft security advisory directly via the Security tab, or contact the maintainer through GitHub.

## What to include

- Affected version (output of `cat <bundle>/VERSION` or git commit SHA)
- Affected host (Claude Code / OpenCode / both)
- Reproduction steps
- Impact assessment — what an attacker could do
- Suggested mitigation if you have one

## Response expectations

Triple Threat is a small project — best-effort response only:

- **Acknowledgment**: within 7 days
- **Initial assessment**: within 14 days
- **Fix or mitigation**: depends on severity and complexity
- **Public disclosure**: coordinated with the reporter; usually after a fix ships

## Out of scope

- **Upstream dependencies** (GSD, GStack, Superpowers) — please report those to the respective upstream projects. See [`DEPENDENCIES.md`](DEPENDENCIES.md) for repo links.
- **Issues requiring prior local compromise** — Triple Threat installs symlinks to local files; a hostile machine compromise is outside the threat model.
- **Theoretical issues without a working proof-of-concept** — please include a reproducer.

## Acknowledgments

Reporters who follow this policy will be acknowledged in the release notes for the fix, unless they prefer to remain anonymous.
