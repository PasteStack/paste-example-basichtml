#!/bin/sh
# Copyright (c) 2017–present Tomshley LLC
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Lint the site's JavaScript with the JSLint edition paste-elements vendors,
# each file under its own /*jslint*/ header and no other options, as
# paste-elements' JSLint test runs it. paste-elements' other source gates
# are not run here; CONTRIBUTING.md names the one place the site departs
# from them. Run it with:
#
#   sh scripts/lint-js.sh
#
# It needs Node.js and the paste-elements release scripts/fetch-deps.sh put
# in vendor/. It prints every warning and fails if there is one.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JSLINT="${ROOT}/vendor/paste-elements/tests/vendor/jslint-2014-04-21.cjs"

[ -f "${JSLINT}" ] || {
  echo "ERROR: ${JSLINT} not found (run 'sh scripts/fetch-deps.sh')" >&2; exit 1; }
command -v node >/dev/null 2>&1 || {
  echo "ERROR: node not found; the linter runs on Node.js" >&2; exit 1; }

RUNNER='
const fs = require("fs"), path = require("path"), vm = require("vm");
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(process.argv[1], "utf8"), context);
let warnings = 0;
for (const file of process.argv.slice(2)) {
  context.JSLINT(fs.readFileSync(file, "utf8"), {maxerr: 10000});
  const errors = (context.JSLINT.errors || []).filter(Boolean);
  warnings += errors.length;
  console.log(path.relative(process.cwd(), file) + ": " + errors.length + " warnings");
  for (const e of errors) {
    console.log("  " + e.line + ":" + e.character + " " + e.reason);
  }
}
process.exit(warnings ? 1 : 0);
'

cd "${ROOT}"
find src/js -name '*.js' -print0 | sort -z | xargs -0 node -e "${RUNNER}" "${JSLINT}"
