# Overview

GitHub Actions requires all dependencies to be present in the repository, which
either means committing `node_modules` or committing output from `ncc build`.
The `ncc build` approach has a much smaller impact on the git log and is
adopted here.
