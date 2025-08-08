Custom Release Instructions

In this fork of webdriverio, the testRunner error fix changes and tgz packaging script for the custom release are on this branch:
`wdio-browser-runner-error-handling-custom-release`

If we want to get the latest version of wdio and apply our changes, the steps are written below.
First we update the main branch.
`git checkout main`
Fetch the latest changes from the upstream repository (i.e., the original repo you forked from webdriverio/webdriverio).
`git fetch upstream`
Rebase our fork's 'main' branch onto the latest upstream/main.
`git rebase upstream/main`
Branch off of main
`git checkout -b v<wdio_version>-custom`

Then we switch to the branch with our fix.
`git checkout wdio-browser-runner-error-handling-custom-release`
Then we branch off of it so as to not modify our original fix branch.
`git checkout -b fix-with-main-rebase-v<wdio_version>`
Change the base of our fix branch to be what's on the updated main.
`git rebase main`

Make a PR merging `fix-with-main-rebase-v<wdio_version>` into `v<wdio_version>-custom`.

Once it's merged, switch back to our release branch `v<wdio_version>-custom`.
And then run the following commands at the top-level directory:
Build the wdio packages.
`pnpm build`
Run the custom packaging script.
`node pack-runner-with-resolved-deps.mjs`
This will generate 3 .tgz files
- `wdio-runner-<wdio_version>.tgz`
- `wdio-local-runner-<wdio_version>.tgz`
- `wdio-browser-runner-<wdio_version>.tgz`
