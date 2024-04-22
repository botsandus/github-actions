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

To ensure that the SSH session is as useful as possible for debugging, this
step should be placed immediately before the build.  This avoids scenarios
where cleanup from other post steps removes things that may be useful for
debugging, such as logging out of docker container registries.
