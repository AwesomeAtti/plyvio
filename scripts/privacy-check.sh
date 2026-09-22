#!/bin/sh
#
# Keeps personal details out of everything this repository publishes.
#
# Refuses a commit or push that contains, in any file's content, any file
# name, any commit message or any author/committer field:
#   - the home directory of whoever is running it ($HOME), and
#   - any word in the local-only list .git/info/privacy-words
#     (one per line, matched case-insensitively; never committed).
# Commit messages are also refused for attribution trailers.
#
# The word list is deliberately NOT in the repository: a committed list would
# publish the very words it protects. If the list is missing, this refuses
# (fails closed) rather than letting everything through.
#
#   sh scripts/privacy-check.sh install        install the git hooks below
#   sh scripts/privacy-check.sh staged         pre-commit: staged files and names
#   sh scripts/privacy-check.sh message FILE   commit-msg: the message
#   sh scripts/privacy-check.sh push REMOTE    pre-push: reads git's ref list on stdin
#   sh scripts/privacy-check.sh all            scan every object in the repository
#
# POSIX sh, so it runs under macOS's /bin/sh as well as Linux's.

set -u

GIT_DIR=$(git rev-parse --git-common-dir 2>/dev/null) || { echo "privacy-check: not in a git repository" >&2; exit 2; }
WORDS="$GIT_DIR/info/privacy-words"
ZERO=0000000000000000000000000000000000000000
TRAILERS='^[[:space:]]*(co-authored-by|assisted-by)[[:space:]]*:|generated with'

fail() { echo "privacy-check: REFUSED — $1" >&2; }

need_words() {
  if [ ! -s "$WORDS" ]; then
    fail "the word list $WORDS is missing or empty."
    echo "  Create it with one word per line (names, tool names) before committing or pushing." >&2
    exit 1
  fi
}

scan_stream() {
  # stdin → matching lines on stdout; exit 0 if any matched
  tmp=$(mktemp) || exit 2
  cat > "$tmp"
  found=1
  if [ -n "${HOME:-}" ] && [ "$HOME" != "/" ] && grep -a -q -F -- "$HOME" "$tmp"; then
    grep -a -n -F -- "$HOME" "$tmp" | head -3; found=0
  fi
  if grep -a -q -i -F -f "$WORDS" "$tmp"; then
    grep -a -n -i -F -f "$WORDS" "$tmp" | head -3; found=0
  fi
  rm -f "$tmp"
  return $found
}

check_staged() {
  need_words
  bad=0
  git diff --cached --name-only --diff-filter=ACMRT | while IFS= read -r path; do
    if printf '%s\n' "$path" | scan_stream >/dev/null; then
      fail "a file NAME contains a protected word: $path"; echo x
    fi
    if out=$(git cat-file -p ":$path" 2>/dev/null | scan_stream); then
      fail "staged file $path contains:"; printf '%s\n' "$out" | sed 's/^/    /' >&2; echo x
    fi
  done | grep -q x && bad=1
  [ $bad -eq 0 ] || { echo "  Remove it, or if it is truly fine, adjust $WORDS." >&2; exit 1; }
}

check_message() {
  need_words
  msg=$(grep -v '^#' "$1")
  bad=0
  if out=$(printf '%s\n' "$msg" | scan_stream); then
    fail "the commit message contains:"; printf '%s\n' "$out" | sed 's/^/    /' >&2; bad=1
  fi
  if printf '%s\n' "$msg" | grep -q -i -E "$TRAILERS"; then
    fail "the commit message has an attribution trailer:"; printf '%s\n' "$msg" | grep -i -E "$TRAILERS" | sed 's/^/    /' >&2; bad=1
  fi
  [ $bad -eq 0 ] || exit 1
}

# Scan every object (commits: message + author; trees: file names; blobs:
# content; tags) listed on stdin, one object id per line.
scan_objects() {
  hits=0
  while read -r obj rest; do
    [ -n "$obj" ] || continue
    if out=$(git cat-file -p "$obj" 2>/dev/null | scan_stream); then
      where=$(printf '%s' "$rest"); [ -n "$where" ] || where=$(git cat-file -t "$obj")
      fail "$where ($obj) contains:"; printf '%s\n' "$out" | sed 's/^/    /' >&2
      hits=$((hits + 1))
    fi
  done
  [ $hits -eq 0 ]
}

check_push() {
  need_words
  remote=${1:-}
  bad=0
  while read -r local_ref local_sha remote_ref remote_sha; do
    [ "$local_sha" = "$ZERO" ] && continue            # deleting a ref: nothing leaves
    if [ "$remote_sha" != "$ZERO" ] && git cat-file -e "$remote_sha^{commit}" 2>/dev/null; then
      range="$remote_sha..$local_sha"
    else
      # A new ref, or the remote points at a commit this repository doesn't
      # have (normal after a history rewrite): scan everything the remote's
      # known branches lack. Scanning too much is safe; too little is not.
      range="$local_sha --not --remotes=$remote"
    fi
    # Fail closed: if git can't list what is being pushed, refuse the push
    # rather than scanning an empty list and letting it through.
    objs=$(mktemp) || exit 2
    # shellcheck disable=SC2086
    if ! git rev-list --objects $range > "$objs"; then
      fail "could not list what is being pushed to $remote_ref ($range)"; bad=1
    elif ! scan_objects < "$objs"; then
      bad=1
    fi
    rm -f "$objs"
    # shellcheck disable=SC2086
    if ! msgs=$(git log --format='%B' $range); then
      fail "could not read the commit messages being pushed to $remote_ref"; bad=1
    elif printf '%s\n' "$msgs" | grep -q -i -E "$TRAILERS"; then
      fail "a commit being pushed to $remote_ref has an attribution trailer"; bad=1
    fi
  done
  [ $bad -eq 0 ] || { echo "  Nothing was pushed." >&2; exit 1; }
}

check_all() {
  need_words
  git cat-file --batch-all-objects --batch-check='%(objectname)' | scan_objects || exit 1
  echo "privacy-check: all objects clean"
}

install_hooks() {
  hooks="$GIT_DIR/hooks"
  # The hooks look the script up at run time, so they work wherever the repo
  # is checked out (the same folder can be mounted at different paths).
  for h in pre-commit commit-msg pre-push; do
    case $h in
      pre-commit) args='staged' ;;
      commit-msg) args='message "$1"' ;;
      pre-push)   args='push "$1"' ;;
    esac
    printf '#!/bin/sh\n# Installed by scripts/privacy-check.sh. Do not bypass with --no-verify.\nexec sh "$(git rev-parse --show-toplevel)/scripts/privacy-check.sh" %s\n' "$args" > "$hooks/$h"
    chmod +x "$hooks/$h"
  done
  echo "privacy-check: hooks installed in $hooks (pre-commit, commit-msg, pre-push)"
  [ -s "$WORDS" ] || echo "privacy-check: now create $WORDS — until then every commit and push is refused." >&2
}

case ${1:-} in
  install) install_hooks ;;
  staged)  check_staged ;;
  message) check_message "${2:?message file}" ;;
  push)    check_push "${2:-}" ;;
  all)     check_all ;;
  *) sed -n '2,24p' "$0"; exit 2 ;;
esac
