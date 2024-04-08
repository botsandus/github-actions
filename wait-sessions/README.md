## Overview

GitHub Actions post step to wait for all interactive sessions to close before
the job completes.  This is useful if users are connected to the runner via SSH
or similar to ensure that they don't get disconnected.  The action initially
waits `wait-minutes` for connections to be established.  After this initial
time, the action waits for any open sessions to be closed before terminating.
Sessions are detected by the presence of a named process, by default, `login`.

The job will also tail a log file to provide feedback on an underlying service
that might be useful when debugging connectivity - this is enabled using the
`tail-log` optional input.

The action can be can terminated at any time using the GitHub Actions cancel
button.

Usage:

```yaml
steps:
  - name: Wait for sessions
    uses: botsandus/github-actions/wait-sessions@master
```

For optional input parameters, see [action.yml](action.yml).
