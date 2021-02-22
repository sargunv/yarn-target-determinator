<h3 align="center">Yarn Target Determinator</h3>
<p align="center">
  A GitHub Action that determines a list of Yarn 2 workspaces to test using a
  list of changed files.
<p>
<p align="center">
  <img
    alt="CI status"
    src="https://github.com/sargunv/yarn-target-determinator/actions/workflows/ci.yml/badge.svg"
  >
</p>

## Overview

This Action determines a list of Yarn 2 workspaces that need to be tested based
on an input list of changed files. It'll return a list containing the workspaces
that changed, as well as which other workspaces depend on the changed
workspaces, and so on. It's best used alongside
https://github.com/jitterbit/get-changed-files.

It requires the Yarn
[workspace-tools](https://yarnpkg.com/api/modules/plugin_workspace_tools.html)
plugin to be installed in your repo!

This Action makes a few assumptions:

- You're using Yarn 2 and have the `workspace-tools` plugin installed.
- You're using [Yarn Workspaces](https://yarnpkg.com/features/workspaces) with a
  single worktree at the root of your repo.
- All `package.json` files in your repo are for workspaces that are members of
  the root worktree.

## Example

Imagine a Yarn 2 monorepo with two workspaces `frontend` and `backend` that
depend on a third workspace `common`. If somebody opens a PR that changes just
the `frontend` workspace, the workflow below will run the `test` job on only
`frontend`. If another PR touches files in `common`. the workflow below will
understand the dependency tree and run the `test` job on `common`, `frontend`,
and `backend`.

As more workspaces are added to your monorepo, this Action will continue to
determine targets accurately without any manual reconfiguration.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  target-determinator:
    runs-on: ubuntu-20.04
    outputs:
      targets: ${{ steps.set-targets.outputs.targets }}
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
      - id: get-changed-files
        uses: jitterbit/get-changed-files@v1
        with:
          format: json
      - id: target-determinator
        uses: sargunv/yarn-target-determinator@v1
        with:
          files: ${{ steps.get-changed-files.outputs.all }}
      - id: set-targets
        run:
          echo '::set-output name=targets::${{
          steps.target-determinator.outputs.targets }}'

  test:
    runs-on: ubuntu-20.04
    needs: [target-determinator]
    strategy:
      fail-fast: false
      matrix:
        target: ${{ fromJson(needs.target-determinator.outputs.targets) }}
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v1
      - run: yarn workspaces focus ${{ matrix.target }}
      - run: yarn workspace ${{ matrix.target }} run test
```
