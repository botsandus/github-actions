# Hiroz (Dexory fork)

`botsandus/hiroz` is a fork of public [ZettaScaleLabs/hiroz](https://github.com/ZettaScaleLabs/hiroz).
Dexory CI (codegen, `libhiroz.a`, product tags) lives **here** so the `dexory`
branch stays close to upstream: thin `uses:` stubs in the fork, job bodies in
this repo.

Auto-sandbox pin-bump / PR labelling is **not** here. That is auto-sandbox
release glue (`botsandus/auto-sandbox` `.github/scripts/hiroz-msgs.sh` +
`hiroz_msgs.yaml`).

## Model

```
auto-sandbox/src/auto/**          ← SOURCE of custom .msg (arri_*, custom_msgs, …)
        │  (pinned SHA in dexory-msgs.pin; fetched by CI, no submodule)
        ▼
botsandus/hiroz  (branch: dexory) ← OWNER of codegen; ONE repo, ONE Dexory version
        ├─ crates/hiroz            → runtime (Rust) / crates/hiroz-go (Go)
        ├─ crates/hiroz-msgs       → STANDARD ROS 2 types (lyrical set)
        ├─ dexory-msgs-rust/       → crate `dexory-msgs`  (CUSTOM types, Rust)
        └─ dexory-msgs-go/         → module `.../dexory-msgs-go` (CUSTOM + bundled standard, Go)
        │
        ▼
your project  ← pins ONE Dexory version; gets runtime + standard + custom, consistent
```

Custom types come from `dexory-msgs`; standard types (`std_msgs`,
`geometry_msgs`, …) from `hiroz-msgs`. Consumers pin **one** Dexory version —
see `dexory-msgs-INTEGRATION.md` on the fork.

## What runs where

```
auto-sandbox                         this repo                         botsandus/hiroz (dexory)
───────────                          ─────────                         ───────────────────────
.msg / vendor.repos change
  hiroz_msgs.yaml ──label────────►                                     (no workflow body)

tagged release
  hiroz-msgs.sh pin-bump ────────────────────────────────────────────► dexory-msgs.pin PR
                                                                       then dispatch
                                                                         dexory-msgs.yml
                                                                           │
                                                                           ▼
                                     hiroz-dexory-msgs.yml  ◄──────────  uses: @master
                                     hiroz-build-go-libs.yml◄──────────  uses: @master
                                     hiroz-cut-release.yml  ◄──────────  Cut Dexory release
```

| Workflow | Caller in the fork | What it does |
|---|---|---|
| [`.github/workflows/hiroz-dexory-msgs.yml`](.github/workflows/hiroz-dexory-msgs.yml) | `dexory-msgs.yml` | Drift-check: regenerate from `dexory-msgs.pin` + `git diff`. `commit=true` (workflow_dispatch / pin-bump) regenerates and pushes. Needs a token that can read private auto-sandbox + `vendor.repos`. |
| [`.github/workflows/hiroz-build-go-libs.yml`](.github/workflows/hiroz-build-go-libs.yml) | `build-go-libs.yml` | Build lyrical `libhiroz.a` for linux-x64 / linux-arm64 / darwin-arm64 and upload artifacts. **Does not** create a GitHub Release. |
| [`.github/workflows/hiroz-cut-release.yml`](.github/workflows/hiroz-cut-release.yml) | `cut-dexory-release.yml` (**Cut Dexory release**) | One version: tags `dexory/vX.Y.Z` and `dexory-msgs-go/vX.Y.Z` on the same commit, attaches `libhiroz-lyrical-*.a` + `hiroz_ffi.h`. Tags are immutable; do not clobber `go-libs-lyrical`. `minor` = message changes, `patch` = runtime/FFI only. |

GitHub cannot `on: push` this repo from auto-sandbox; the fork (or auto-sandbox) must still have a caller workflow.

## Callers

Until this branch is merged, pin at `@hiroz-dexory-workflows`. After merge, `@master`.

```yaml
jobs:
  dexory-msgs:
    uses: botsandus/github-actions/.github/workflows/hiroz-dexory-msgs.yml@master
    secrets: inherit
    permissions:
      contents: write
    with:
      commit: ${{ github.event_name == 'workflow_dispatch' && inputs.commit || false }}
```

`secrets: inherit` is required so `HIROZ_READ_TOKEN` (or `AUTO_SANDBOX_READ_TOKEN`)
reaches the reusable workflow. The reusable workflow checkouts **the caller**
(`botsandus/hiroz`), not this repo.

## Tagging

Do not pin a raw `dexory` SHA and do not use upstream `v*` tags (ZettaScale).
After work lands on `dexory`: Actions → **Cut Dexory release**.

| Pin this | What it is |
|---|---|
| `dexory/vX.Y.Z` | Product tag. Rust: `hiroz` + `hiroz-msgs` + `dexory-msgs` |
| `dexory-msgs-go/vX.Y.Z` | Go nested-module tag (Go cannot resolve a nested module from `dexory/vX.Y.Z`) |
| GitHub Release `dexory/vX.Y.Z` | `libhiroz-lyrical-*.a` + `hiroz_ffi.h` |

Auto-sandbox `v8.x` tags do not 1:1 create Dexory tags. Merge the pin-bump PR,
then cut when consumers should pick it up. Next version after
`dexory-msgs-go/v0.5.0` is **0.6.0**.

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
locate the following section of the `Tailscale SSH debug` step output to
determine the SSH command to use:

```
Warning: SSH Debugging Enabled
To connect using SSH, run the following from inside the tailnet:
  ssh runner@github-${{repo}}-${{run_number}}-${{run_attempt}}
Your tailscale user must be in group:developers
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
