## Overview

Connect to Tailscale in order to allow developers to SSH onto the GitHub
Actions runner.  For user instructions, see [github-actions](..).

Usage:
```yaml
steps:
  - name: Tailscale SSH debug
    uses: botsandus/github-actions/tailscale-ssh@master
    with:
      ts-authkey: ${{ secrets.TAILSCALE_CI_BUILDER_KEY }}
```

For optional input parameters, see [action.yml](action.yml).
