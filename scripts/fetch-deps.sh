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
# Fetch the releases pinned in paste-deps.conf into vendor/:
#
#   vendor/paste             paste at its tag, checked against the pinned commit
#   vendor/paste-elements    paste-elements at its tag, checked the same way
#   vendor/paste-assetgraph  the compiler release binary for this machine,
#                            checked against its pinned SHA-256, with the
#                            release's LICENSE, NOTICE.md and
#                            THIRD_PARTY_LICENSES.md
#   vendor/jquery            jQuery and its licence, for the performance
#                            page's comparison, checked the same way
#
#   sh scripts/fetch-deps.sh
#
# Anything already in vendor/ that matches its pin is kept; anything else,
# including a checkout or file with local changes, is fetched again, and the
# script says so. Nothing is installed outside the repository.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENDOR="${ROOT}/vendor"
# shellcheck source=/dev/null
. "${ROOT}/paste-deps.conf"
REPOS="https://gitlab.com/tomshley/brands/global/tware/tech/products/paste"
RELEASE="https://gitlab.com/api/v4/projects/76219588/packages/generic/paste-assetgraph/${PASTE_ASSETGRAPH_VERSION}"

if command -v sha256sum >/dev/null 2>&1; then SHA256="sha256sum"; else SHA256="shasum -a 256"; fi
sha_of() { ${SHA256} "$1" | cut -d' ' -f1; }

# fetch_repo <name> <tag> <commit>
fetch_repo() {
  dir="${VENDOR}/$1"
  # Kept only at the pinned commit and with no local changes.
  if [ -d "${dir}/.git" ] &&
     [ "$(git -C "${dir}" rev-parse -q --verify HEAD 2>/dev/null)" = "$3" ] &&
     [ -z "$(git -C "${dir}" status --porcelain)" ]; then
    echo "$1 $2: present"
    return
  fi
  if [ -e "${dir}" ]; then
    echo "$1: vendor/$1 does not match its pin; replacing it"
  fi
  rm -rf "${dir}"
  git init --quiet "${dir}"
  git -C "${dir}" fetch --quiet --depth 1 "${REPOS}/$1.git" "refs/tags/$2"
  git -C "${dir}" -c advice.detachedHead=false checkout --quiet FETCH_HEAD
  got="$(git -C "${dir}" rev-parse HEAD)"
  if [ "${got}" != "$3" ]; then
    rm -rf "${dir}"
    echo "ERROR: $1 $2 is commit ${got}, but paste-deps.conf pins $3" >&2
    exit 1
  fi
  echo "$1 $2: fetched"
}

# fetch_file <url> <destination> <sha256>
fetch_file() {
  if [ -f "$2" ] && [ "$(sha_of "$2")" = "$3" ]; then
    return
  fi
  if [ -e "$2" ]; then
    echo "${2#"${ROOT}/"} does not match its pin; replacing it"
  fi
  rm -f "$2.part"
  curl -fsSL -o "$2.part" "$1"
  got="$(sha_of "$2.part")"
  if [ "${got}" != "$3" ]; then
    rm -f "$2.part"
    echo "ERROR: $1 has SHA-256 ${got}, but paste-deps.conf pins $3" >&2
    exit 1
  fi
  mv "$2.part" "$2"
}

# The pins below are assigned in paste-deps.conf.
# shellcheck disable=SC2154
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) PLATFORM=darwin-aarch64; WANT="${PASTE_ASSETGRAPH_SHA256_darwin_aarch64}" ;;
  Darwin-x86_64) PLATFORM=darwin-amd64; WANT="${PASTE_ASSETGRAPH_SHA256_darwin_amd64}" ;;
  Linux-x86_64) PLATFORM=linux-amd64-musl; WANT="${PASTE_ASSETGRAPH_SHA256_linux_amd64_musl}" ;;
  Linux-aarch64|Linux-arm64) PLATFORM=linux-aarch64-musl; WANT="${PASTE_ASSETGRAPH_SHA256_linux_aarch64_musl}" ;;
  *)
    echo "ERROR: no paste-assetgraph release binary for $(uname -s) $(uname -m)." >&2
    echo "       Build it from source (see the paste-assetgraph README) and set PASTE_ASSETGRAPH_BIN." >&2
    exit 1 ;;
esac

mkdir -p "${VENDOR}/paste-assetgraph" "${VENDOR}/jquery"
fetch_repo paste "${PASTE_TAG}" "${PASTE_COMMIT}"
fetch_repo paste-elements "${PASTE_ELEMENTS_TAG}" "${PASTE_ELEMENTS_COMMIT}"
fetch_file "${RELEASE}/paste-assetgraph-${PLATFORM}" "${VENDOR}/paste-assetgraph/paste-assetgraph" "${WANT}"
chmod +x "${VENDOR}/paste-assetgraph/paste-assetgraph"
fetch_file "${RELEASE}/LICENSE" "${VENDOR}/paste-assetgraph/LICENSE" "${PASTE_ASSETGRAPH_SHA256_LICENSE}"
fetch_file "${RELEASE}/NOTICE.md" "${VENDOR}/paste-assetgraph/NOTICE.md" "${PASTE_ASSETGRAPH_SHA256_NOTICE}"
fetch_file "${RELEASE}/THIRD_PARTY_LICENSES.md" "${VENDOR}/paste-assetgraph/THIRD_PARTY_LICENSES.md" \
  "${PASTE_ASSETGRAPH_SHA256_THIRD_PARTY_LICENSES}"
echo "paste-assetgraph ${PASTE_ASSETGRAPH_VERSION} (${PLATFORM}): checked"
fetch_file "https://code.jquery.com/jquery-${JQUERY_VERSION}.min.js" \
  "${VENDOR}/jquery/jquery-${JQUERY_VERSION}.min.js" "${JQUERY_SHA256}"
fetch_file "https://raw.githubusercontent.com/jquery/jquery/${JQUERY_VERSION}/LICENSE.txt" \
  "${VENDOR}/jquery/LICENSE.txt" "${JQUERY_LICENSE_SHA256}"
echo "jquery ${JQUERY_VERSION}: checked"
echo
echo "Ready: sh scripts/build-dist.sh"
