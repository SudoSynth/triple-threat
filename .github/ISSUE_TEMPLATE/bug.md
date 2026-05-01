---
name: Bug
about: Something broke or behaves unexpectedly
labels: bug
---

## What broke

<!-- One sentence: what happened, what should have happened. -->

## Host

<!-- Which AI CLI? This determines which bundle code is involved. -->

- [ ] Claude Code (`claude/`)
- [ ] OpenCode (`opencode/`)
- [ ] Both

## Install mode

- [ ] Cloned this repo and ran `bash <bundle>/install.sh`
- [ ] Unzipped a release bundle and ran `bash install.sh`
- [ ] `cp -r` per legacy README instructions
- [ ] Other (describe below)

## Repro steps

1.
2.
3.

## Expected behavior

<!-- What should have happened. -->

## Actual behavior

<!-- What actually happened. Paste error output, screenshots, or run logs. -->

## Test evidence

<!-- Did you reproduce against a fresh HOME? Did /build-doctor surface anything? -->

## Environment

- OS: <!-- macOS / Linux / WSL2 -->
- AI CLI version: <!-- e.g. `claude --version` -->
- Triple Threat version: <!-- contents of <bundle>/VERSION -->
