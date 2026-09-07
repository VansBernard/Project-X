# Working Tree Classification

This repository currently contains a large local development change set. The groups below define what belongs in a review or release branch.

## Keep And Review

- `apps/api/src/`: API implementation, middleware, modules, and tests.
- `apps/api/prisma/schema.prisma` and numbered migration directories: database contract and migrations. Review migration order and apply them only through the normal Prisma workflow.
- `apps/admin/src/`, `apps/admin/public/`, and admin configuration: dealer dashboard implementation and assets.
- `apps/DesktopApp1/DesktopAppFresh/`: the sole supported WPF desktop application. Keep its source files, project file, runtime assets, and launch script.
- Root package manifests, API/admin environment examples, documentation, and scripts that are part of the supported developer workflow.

## Keep Separately Until Reviewed

- `apps/desktop/` deletions: superseded planned desktop architecture and anti-tampering prototype. Do not restore these files unless the desktop architecture is intentionally redesigned.
- API repair, migration, seed, and diagnostic scripts outside `apps/api/src/`: retain for investigation, but promote only scripts with a documented repeatable purpose.
- New API tests and new admin components: review together with the implementation changes that depend on them.

## Local-Only Artifacts

- Root logs, `buildlog.txt`, `X.zip`, API status/session files, `apps/api/tmp/`, `apps/api/tmp_*`, and `apps/api/debug-*` files are local investigation artifacts and are ignored by Git.
- `.env` files and generated key directories are already ignored. Never commit their contents.

## Cleanup Rule

This classification does not delete or revert anything. Before preparing a commit, stage only the reviewed product source, migrations, tests, and documentation. One-off repair scripts should be moved to an explicitly documented operations location or kept outside the repository.

## Verified Checks

- API tests: 27 passing.
- Admin tests: 3 passing.
- API/admin TypeScript checks: passing.
- Prisma schema validation: passing.
- Desktop WPF build: passing.