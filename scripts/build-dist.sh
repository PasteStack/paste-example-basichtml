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
# Assemble dist/, the deployable site, from src/:
#
#   sh scripts/build-dist.sh [--refresh]
#
# It uses the releases scripts/fetch-deps.sh put in vendor/. PASTE_CORE_JS
# (a paste src/js directory), PASTE_ELEMENTS (a paste-elements root) and
# PASTE_ASSETGRAPH_BIN (the compiler) override them. With neither
# PASTE_ASSETGRAPH_BIN nor a compiler in vendor/, the compiler is
# `paste-assetgraph` on PATH.
#
# 1. Images are published, immutable files: published.manifest must list
#    exactly the files under src/images with their unchanged SHA-256. An
#    update ships under a new filename.
# 2. paste-assetgraph compiles src/scss and the paste and paste-elements
#    modules into individual versioned files under dist/css and dist/js.
# 3. Each page carries its own asset tags, between a
#    `<!-- paste-assetgraph css|js: <modules> -->` line and a
#    `<!-- /paste-assetgraph -->` line, and the build checks every block
#    against what `paste-assetgraph render --per-module` prints for those
#    modules. A stale block fails the build; --refresh rewrites the blocks
#    in src/ instead, for review in the diff. The page is never rewritten
#    on its way to dist/.
# 4. For the performance page, jQuery and its licence go to dist/vendor/
#    under versioned names, and TaskSpeed's licence to dist/taskspeed/.
# 5. Images are optimized losslessly in dist/ only, so the manifest keeps
#    pinning the authored bytes.
# 6. The pages, _headers and favicon.ico are copied as they are.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/src"
DIST="${ROOT}/dist"
TARGET="${ROOT}/target"
MANIFEST="${ROOT}/published.manifest"
AG_MANIFEST="${TARGET}/paste-assetgraph-manifest.json"
# scripts/fetch-deps.sh puts the pinned releases in vendor/; the environment
# overrides any of them.
VENDOR="${ROOT}/vendor"
# shellcheck source=/dev/null
. "${ROOT}/paste-deps.conf"
JQUERY_JS="${VENDOR}/jquery/jquery-${JQUERY_VERSION}.min.js"
PASTE_CORE_JS="${PASTE_CORE_JS:-${VENDOR}/paste/src/js}"
PASTE_ELEMENTS="${PASTE_ELEMENTS:-${VENDOR}/paste-elements}"
if [ -n "${PASTE_ASSETGRAPH_BIN:-}" ]; then
  AG="${PASTE_ASSETGRAPH_BIN}"
elif [ -x "${VENDOR}/paste-assetgraph/paste-assetgraph" ]; then
  AG="${VENDOR}/paste-assetgraph/paste-assetgraph"
else
  AG="paste-assetgraph"
fi

# A failed or interrupted build leaves no dist/ behind, so nothing
# half-built can deploy.
BUILT=0
TMPD=""
trap '[ -z "${TMPD}" ] || rm -rf "${TMPD}"; [ "${BUILT}" -eq 1 ] || rm -rf "${DIST}"' EXIT
trap 'exit 1' HUP INT TERM

case "${1:-}" in
  --refresh) REFRESH=1 ;;
  "") REFRESH=0 ;;
  *) echo "usage: build-dist.sh [--refresh]" >&2; exit 2 ;;
esac

# The compiler runs from the repository root, so relative paths are resolved
# against the caller's directory first.
given="${PASTE_CORE_JS}"
PASTE_CORE_JS="$(CDPATH='' cd -- "${given}" 2>/dev/null && pwd)" || {
  echo "ERROR: no paste at ${given}: run 'sh scripts/fetch-deps.sh' or set PASTE_CORE_JS" >&2; exit 1; }
given="${PASTE_ELEMENTS}"
PASTE_ELEMENTS="$(CDPATH='' cd -- "${given}" 2>/dev/null && pwd)" || {
  echo "ERROR: no paste-elements at ${given}: run 'sh scripts/fetch-deps.sh' or set PASTE_ELEMENTS" >&2; exit 1; }
case "${AG}" in
  */*) AG="$(CDPATH='' cd -- "$(dirname -- "${AG}")" 2>/dev/null && pwd)/$(basename -- "${AG}")" || {
         echo "ERROR: PASTE_ASSETGRAPH_BIN's directory does not exist: ${AG}" >&2; exit 1; } ;;
esac
[ -f "${PASTE_CORE_JS}/paste.js" ] || {
  echo "ERROR: PASTE_CORE_JS does not contain paste.js: ${PASTE_CORE_JS}" >&2; exit 1; }
[ -f "${PASTE_ELEMENTS}/base/_base.scss" ] || {
  echo "ERROR: PASTE_ELEMENTS does not contain base/_base.scss: ${PASTE_ELEMENTS}" >&2; exit 1; }
# Both paths land inside quoted HOCON strings below.
case "${PASTE_CORE_JS}${PASTE_ELEMENTS}" in
  *'"'*|*\\*) echo "ERROR: PASTE_CORE_JS and PASTE_ELEMENTS must not contain quotes or backslashes" >&2; exit 1 ;;
esac
command -v "${AG}" >/dev/null 2>&1 || {
  echo "ERROR: paste-assetgraph not found: ${AG} (run 'sh scripts/fetch-deps.sh' or set PASTE_ASSETGRAPH_BIN)" >&2; exit 1; }
[ -f "${JQUERY_JS}" ] && [ -f "${VENDOR}/jquery/LICENSE.txt" ] || {
  echo "ERROR: no jQuery ${JQUERY_VERSION} in vendor/jquery: run 'sh scripts/fetch-deps.sh'" >&2; exit 1; }

TMPD="$(mktemp -d)"

# sha256sum on CI images, shasum -a 256 on macOS. Manifest lines are in
# `sha256sum` format: <hash><two spaces><path relative to src/>.
if command -v sha256sum >/dev/null 2>&1; then
  SHA256C="sha256sum -c"
else
  SHA256C="shasum -a 256 -c"
fi

# Every manifest line is a hash and an image path; the checksum tools skip
# lines that are not, so a malformed line would never be verified.
[ -f "${MANIFEST}" ] || { echo "ERROR: published.manifest not found" >&2; exit 1; }
if grep -v -E '^[0-9a-f]{64}  images/' "${MANIFEST}" > "${TMPD}/malformed.txt"; then
  echo "ERROR: published.manifest lines must read '<sha256>  images/<path>':" >&2
  cat "${TMPD}/malformed.txt" >&2
  exit 1
fi

# The manifest and src/images must name exactly the same files, then every
# listed file must still hold its published bytes.
: > "${TMPD}/on-disk.txt"
if [ -d "${SRC}/images" ]; then
  (cd "${SRC}" && find images -type f ! -path '*/.*' -print | sort) > "${TMPD}/on-disk.txt"
fi
cut -c 67- "${MANIFEST}" | sort > "${TMPD}/listed.txt"
if ! diff -u "${TMPD}/listed.txt" "${TMPD}/on-disk.txt"; then
  echo "ERROR: published.manifest and src/images disagree (missing files or unlisted images above)" >&2
  exit 1
fi
if [ -s "${MANIFEST}" ]; then
  (cd "${SRC}" && ${SHA256C} "${MANIFEST}")
fi

# Each optimizer is required only when there are images of its type.
if grep -qi '\.png$' "${TMPD}/on-disk.txt"; then
  command -v oxipng >/dev/null 2>&1 || {
    echo "ERROR: required optimizer 'oxipng' not on PATH" >&2; exit 1; }
fi
if grep -qi '\.jpe\{0,1\}g$' "${TMPD}/on-disk.txt"; then
  command -v jpegoptim >/dev/null 2>&1 || {
    echo "ERROR: required optimizer 'jpegoptim' not on PATH" >&2; exit 1; }
fi

# A fresh dist/ needs a fresh compiler manifest: versions restart at v1 and
# every file is named by its content hash.
rm -rf "${DIST}" "${AG_MANIFEST}"
mkdir -p "${DIST}" "${TARGET}"
{
  cat "${ROOT}/paste-assetgraph.conf"
  printf 'include-paths = ["%s", "%s", "%s", "%s", "%s", "%s", "%s", "%s"]\n' \
    "${PASTE_CORE_JS}" "${PASTE_ELEMENTS}/base" \
    "${PASTE_ELEMENTS}/modules/heroscroll" "${PASTE_ELEMENTS}/modules/smoothscroll" \
    "${PASTE_ELEMENTS}/modules/stickynav" "${PASTE_ELEMENTS}/modules/scrollspy" \
    "${PASTE_ELEMENTS}/modules/scrolltop" "${PASTE_ELEMENTS}/modules/utilities"
} > "${TARGET}/paste-assetgraph.conf"
(cd "${ROOT}" && "${AG}" build --config target/paste-assetgraph.conf)

cp "${SRC}/_headers" "${DIST}/_headers"
cp "${SRC}/favicon.ico" "${DIST}/favicon.ico"
# jQuery for the performance page's comparison, under its versioned name and
# with its licence; only that page's frames load it.
mkdir -p "${DIST}/vendor"
cp "${JQUERY_JS}" "${DIST}/vendor/jquery-${JQUERY_VERSION}.min.js"
cp "${VENDOR}/jquery/LICENSE.txt" "${DIST}/vendor/jquery-${JQUERY_VERSION}-LICENSE.txt"
# TaskSpeed's licence, beside the frames that run the tasks adapted from it.
mkdir -p "${DIST}/taskspeed"
cp "${ROOT}/LICENSES/TaskSpeed.txt" "${DIST}/taskspeed/LICENSE.txt"
if [ -d "${SRC}/images" ]; then
  cp -R "${SRC}/images" "${DIST}/images"
  # Dotfiles and dot-directories (.DS_Store and the like) are outside the
  # manifest and never deploy.
  find "${DIST}/images" -name '.*' -prune -exec rm -rf {} +
  # Lossless: oxipng keeps colour chunks; jpegoptim drops all JPEG metadata,
  # EXIF orientation and colour profile included (see README, Images).
  find "${DIST}/images" -type f -iname '*.png' -exec oxipng -o 4 --strip safe -q {} +
  find "${DIST}/images" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) \
    -exec jpegoptim --strip-all -q {} +
fi

# Pages: render every tag block, then compare (or, with --refresh, replace).
(cd "${SRC}" && find . -type f -name '*.html' -print | sed 's|^\./||' | sort) > "${TMPD}/pages.txt"
STALE=0
while IFS= read -r page; do
  mkdir -p "${TMPD}/blocks"
  rm -f "${TMPD}/blocks/"*
  grep -n '<!-- paste-assetgraph [a-z]*: .* -->' "${SRC}/${page}" > "${TMPD}/markers.txt" || true
  while IFS= read -r marker; do
    line="${marker%%:*}"
    type="$(printf '%s\n' "${marker}" | sed 's|.*<!-- paste-assetgraph \([a-z]*\): .*|\1|')"
    modules="$(printf '%s\n' "${marker}" | sed 's|.*<!-- paste-assetgraph [a-z]*: \(.*\) -->.*|\1|')"
    case "${type}" in
      css|js) ;;
      *) echo "ERROR: ${page}:${line}: a tag block is css or js, not '${type}'" >&2; exit 1 ;;
    esac
    names=""
    # Split on spaces without expanding globs.
    set -f
    for module in ${modules}; do
      case "${module}" in
        *[!A-Za-z0-9._-]*) echo "ERROR: ${page}:${line}: not a module name: ${module}" >&2; exit 1 ;;
      esac
      names="${names}${names:+,}\"${module}\""
    done
    set +f
    [ -n "${names}" ] || { echo "ERROR: ${page}:${line}: the tag block names no modules" >&2; exit 1; }
    printf '{"events":[{"jam":{"%s":[%s]}},{"dump":"%s"}]}' "${type}" "${names}" "${type}" \
      | "${AG}" render --manifest "${AG_MANIFEST}" --output-base "${DIST}" \
          --inline-threshold 0 --per-module > "${TMPD}/blocks/${line}"
  done < "${TMPD}/markers.txt"

  # Each block's lines take the indentation of its opening line.
  mkdir -p "$(dirname "${TMPD}/pages/${page}")"
  awk -v blocks="${TMPD}/blocks" -v page="${page}" '
    /<!-- paste-assetgraph [a-z]*: .* -->/ {
      if (open) { printf "ERROR: %s:%d: tag block opened inside another\n", page, NR > "/dev/stderr"; failed = 1; exit 1 }
      print
      indent = $0; sub(/[^ \t].*$/, "", indent)
      file = blocks "/" NR
      while ((getline rendered < file) > 0) { print indent rendered }
      close(file)
      open = NR
      next
    }
    /<!-- \/paste-assetgraph -->/ {
      if (!open) { printf "ERROR: %s:%d: tag block closed without an opening line\n", page, NR > "/dev/stderr"; failed = 1; exit 1 }
      open = 0
      print
      next
    }
    !open { print }
    END {
      if (failed) { exit 1 }
      if (open) { printf "ERROR: %s:%d: tag block never closed\n", page, open > "/dev/stderr"; exit 1 }
    }
  ' "${SRC}/${page}" > "${TMPD}/pages/${page}"

  if ! cmp -s "${SRC}/${page}" "${TMPD}/pages/${page}"; then
    if [ "${REFRESH}" -eq 1 ]; then
      cp "${TMPD}/pages/${page}" "${SRC}/${page}"
      echo "refreshed the tag blocks in src/${page}"
    else
      echo "ERROR: the tag blocks in src/${page} are not what the current build renders" >&2
      STALE=1
      continue
    fi
  fi
  mkdir -p "$(dirname "${DIST}/${page}")"
  cp "${SRC}/${page}" "${DIST}/${page}"
done < "${TMPD}/pages.txt"

if [ "${STALE}" -eq 1 ]; then
  echo "Run 'sh scripts/build-dist.sh --refresh' and review the changed tag blocks." >&2
  exit 1
fi

BUILT=1
echo
echo "Assembled dist/:"
(cd "${DIST}" && find . -type f | sed 's|^\./|/|' | sort)
