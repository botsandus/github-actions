# Overview

This repository contains shared templates for GitHub actions, such as any
reusable workflows and composite actions.

# SSH Debug

Some reusable workflows contian a feature to allow users to debug failed builds
on the GitHub runner using SSH.  This feature is provided by
[tailscale-ssh](tailscale-ssh) and [wait-sessions](wait-sessions) and is
available when the following step is shown:

```
Tailscale SSH debug (re-run with debug logging to enable)
```

To enable SSH debug, click the "Re-run jobs" button at the top-right of the
job screen and follow the steps to re-run, after ticking "Enable debug
logging".

In order to to connect, install Tailscale and SSH, login to Tailscale and
locate the following section of the job output to determine the SSH command to
use:

```
Notice: README: SSH Connection instructions
Notice: To connect using SSH, run the following from inside the tailnet:
Notice:   ssh runner@github-xx-xxxxxx-xx
Notice: Your tailscale user must be in group:developers
```

A post-step in the relevant job will wait a configurable number of minutes
(default 10) for SSH sessions to be established.  After this time, the job will
wait for any connections to be closed before allowing the job to complete.

The SSH functionality can be cancelled at any time using the GitHub Actions
cancel button.

If you are a heavy user of debug logging and do not want the SSH debug
functionility to be enabled at all in your workflow, it can be disabled using
the `ssh-debug` input parameter, or the wait time can be tuned using
`ssh-wait-minutes`.

While waiting for sessions to complete, the following message will be displayed
periodically - the IP address following `-h` is the connected user's address on
the Tailnet, which can be queried using `tailscale status`:

```
yyyy-mm-dd hh:mm:ss Waiting for open sessions to close
   pid hh:mm /usr/bin/login -f        -h xxx.xxx.xxx.xxx -p
```
