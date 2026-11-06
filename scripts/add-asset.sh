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
# Publish an image: copy it into src/images, record its SHA-256 in
# published.manifest and print the path it serves from. A published image
# never changes, so anything that would change one is refused.
#
#   sh scripts/add-asset.sh /path/to/photo.jpg            # -> src/images/photo.jpg
#   sh scripts/add-asset.sh /path/to/photo.jpg gallery    # -> src/images/gallery/photo.jpg

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/src"
MANIFEST="${ROOT}/published.manifest"
FILE="${1:?usage: add-asset.sh <image-file> [subdir]}"
SUBDIR="${2:-}"
# A leading dash would read as an option to the tools below.
case "${FILE}" in
  -*) FILE="./${FILE}" ;;
esac

case "${SUBDIR}" in
  "") ;;
  /*|*/|*//*|*[!A-Za-z0-9/_-]*)
    echo "ERROR: subdir must be a relative path of letters, digits, dash, underscore and slashes," >&2
    echo "       with no empty components and no leading or trailing slash: ${SUBDIR}" >&2
    exit 1 ;;
esac
[ -f "${FILE}" ] || { echo "ERROR: no such file: ${FILE}" >&2; exit 1; }
BASE="$(basename "${FILE}")"
case "${BASE}" in
  .*|*.|_*|*[!A-Za-z0-9._-]*)
    echo "ERROR: rename it first, using letters, digits, dash, dot and underscore only: ${BASE}" >&2
    exit 1 ;;
esac

if command -v sha256sum >/dev/null 2>&1; then SHA256="sha256sum"; else SHA256="shasum -a 256"; fi
SHA="$(${SHA256} "${FILE}" | cut -d' ' -f1)"
REL="images/${SUBDIR}${SUBDIR:+/}${BASE}"
DEST="${SRC}/${REL}"
listed() { awk -v p="${REL}" '$2==p{f=1} END{exit !f}' "${MANIFEST}"; }

if [ -f "${DEST}" ]; then
  if [ "$(${SHA256} "${DEST}" | cut -d' ' -f1)" = "${SHA}" ]; then
    if ! listed; then
      echo "ERROR: src/${REL} exists with identical content but is not in the manifest." >&2
      echo "       Refusing to repair an inconsistent publish silently." >&2
      exit 1
    fi
    echo "already published, nothing to do: /${REL}"
    exit 0
  fi
  echo "ERROR: src/${REL} exists with different content." >&2
  echo "       Published images never change; give the update a new filename." >&2
  exit 1
fi
if listed; then
  echo "ERROR: ${REL} is in the manifest but missing from src/." >&2
  echo "       It was published before; put the original back or pick a new filename." >&2
  exit 1
fi

# The copy and its manifest line land together or not at all. A manifest
# whose last line lacks its newline gets one first, so the new line is not
# glued onto it.
mkdir -p "$(dirname "${DEST}")"
if ! {
  cp "${FILE}" "${DEST}" &&
    { [ ! -s "${MANIFEST}" ] || [ -z "$(tail -c 1 "${MANIFEST}")" ] || echo >> "${MANIFEST}"; } &&
    printf '%s  %s\n' "${SHA}" "${REL}" >> "${MANIFEST}"
}; then
  rm -f "${DEST}"
  echo "ERROR: could not copy the image or update published.manifest; src/${REL} was not added" >&2
  exit 1
fi
echo "added src/${REL} and its manifest line; it serves from /${REL}"
echo "commit the image and published.manifest together"
