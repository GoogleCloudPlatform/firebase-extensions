#!/bin/bash

# Script to compare published Firebase extension versions from the registry with local extension.yaml versions
# Usage:
#   ./check-published-versions.sh <extension-name>  - Check a specific extension
#   ./check-published-versions.sh *                 - Check all extensions

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed." >&2
  echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)" >&2
  exit 1
fi

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo "Error: Firebase CLI is required but not installed." >&2
  echo "Install it with: npm install -g firebase-tools" >&2
  exit 1
fi

# Cache for extension list (populated once when checking all extensions)
EXTENSIONS_CACHE=""

# Get local version from extension.yaml
get_local_version() {
  local extension_name="$1"
  local yaml_path="$ROOT_DIR/$extension_name/extension.yaml"

  if [[ ! -f "$yaml_path" ]]; then
    echo "Error: extension.yaml not found in \"$extension_name\" directory" >&2
    return 1
  fi

  # Extract version field from YAML (simple grep-based parser)
  local version=$(grep -E '^version:\s*' "$yaml_path" | sed -E 's/^version:\s*["'\'']?([^"'\'']+)["'\'']?/\1/' | tr -d ' ' || echo "")
  
  if [[ -z "$version" ]]; then
    echo "Error: Version field not found in $yaml_path" >&2
    return 1
  fi

  echo "$version"
}

# Get published version from Firebase Extensions registry
get_published_version() {
  local extension_name="$1"
  local ref="googlecloud/$extension_name"

  # Use cached extensions list if available
  if [[ -n "$EXTENSIONS_CACHE" ]]; then
    local version=$(echo "$EXTENSIONS_CACHE" | jq -r --arg ref "$ref" '
      .result.extensions[] | select(.ref == $ref) | 
      if .latestApprovedVersion then .latestApprovedVersion else .latestVersion end
    ')
    
    if [[ "$version" != "null" && -n "$version" ]]; then
      echo "$version"
      return 0
    fi
  fi

  # Fetch from Firebase CLI
  echo "Fetching published version for $extension_name..." >&2
  
  local json_output
  json_output=$(firebase ext:dev:list googlecloud --json 2>&1) || {
    echo "Error: Failed to fetch extension list from Firebase registry" >&2
    echo "$json_output" >&2
    return 1
  }

  # Check if command succeeded
  local status=$(echo "$json_output" | jq -r '.status // "error"')
  if [[ "$status" != "success" ]]; then
    echo "Error: Firebase CLI returned error status" >&2
    echo "$json_output" >&2
    return 1
  fi

  # Extract version
  local version=$(echo "$json_output" | jq -r --arg ref "$ref" '
    .result.extensions[] | select(.ref == $ref) | 
    if .latestApprovedVersion then .latestApprovedVersion else .latestVersion end
  ')

  if [[ "$version" == "null" || -z "$version" ]]; then
    echo "Error: Extension \"$extension_name\" not found in the published registry" >&2
    return 1
  fi

  echo "$version"
}

# Get all extension directories
get_all_extensions() {
  local extensions=()
  
  for dir in "$ROOT_DIR"/*; do
    if [[ -d "$dir" && -f "$dir/extension.yaml" ]]; then
      extensions+=("$(basename "$dir")")
    fi
  done

  # Sort extensions
  IFS=$'\n' sorted=($(sort <<<"${extensions[*]}"))
  unset IFS
  
  printf '%s\n' "${sorted[@]}"
}

# Check a single extension
check_extension() {
  local extension_name="$1"
  local local_version=""
  local published_version=""
  local local_error=""
  local published_error=""

  # Get local version
  if ! local_version=$(get_local_version "$extension_name" 2>&1); then
    local_error="$local_version"
    local_version=""
  fi

  # Get published version
  if ! published_version=$(get_published_version "$extension_name" 2>&1); then
    published_error="$published_version"
    published_version=""
  fi

  # Return result as JSON-like structure (we'll parse it in bash)
  if [[ -n "$local_error" ]]; then
    echo "ERROR|$extension_name|||$local_error"
  elif [[ -n "$published_error" ]]; then
    echo "NOT_PUBLISHED|$extension_name|$local_version||$published_error"
  elif [[ "$local_version" == "$published_version" ]]; then
    echo "MATCH|$extension_name|$local_version|$published_version|"
  else
    echo "MISMATCH|$extension_name|$local_version|$published_version|"
  fi
}

# Check all extensions
check_all_extensions() {
  local extensions=()
  
  # Use bash 3.2 compatible approach (macOS default)
  while IFS= read -r line; do
    [[ -n "$line" ]] && extensions+=("$line")
  done < <(get_all_extensions)

  if [[ ${#extensions[@]} -eq 0 ]]; then
    echo "No extensions found in the repository."
    return 0
  fi

  echo ""
  echo "Found ${#extensions[@]} extension(s). Checking versions..."
  echo ""

  # Fetch extension list once and cache it
  echo "Fetching extension list from Firebase registry..." >&2
  EXTENSIONS_CACHE=$(firebase ext:dev:list googlecloud --json 2>&1) || {
    echo "Error: Failed to fetch extension list" >&2
    echo "$EXTENSIONS_CACHE" >&2
    return 1
  }

  local matching=()
  local mismatched=()
  local not_published=()
  local errors=()

  # Check each extension
  for ext in "${extensions[@]}"; do
    printf "Checking %s... " "$ext"
    
    local result
    result=$(check_extension "$ext")
    
    IFS='|' read -r status name local_ver pub_ver error <<< "$result"
    
    case "$status" in
      MATCH)
        echo "✓ Match"
        matching+=("$name|$local_ver")
        ;;
      MISMATCH)
        echo "⚠ Mismatch"
        mismatched+=("$name|$local_ver|$pub_ver")
        ;;
      NOT_PUBLISHED)
        echo "⚠ Not published"
        not_published+=("$name|$local_ver")
        ;;
      ERROR)
        echo "✗ Error"
        errors+=("$name|$error")
        ;;
    esac
  done

  # Display summary
  echo ""
  echo "=================================================================================="
  echo "SUMMARY"
  echo "=================================================================================="

  if [[ ${#matching[@]} -gt 0 ]]; then
    echo ""
    echo "✓ Matching (${#matching[@]}):"
    for item in "${matching[@]}"; do
      IFS='|' read -r name version <<< "$item"
      printf "  %-50s %s\n" "$name" "$version"
    done
  fi

  if [[ ${#mismatched[@]} -gt 0 ]]; then
    echo ""
    echo "⚠ Mismatched (${#mismatched[@]}):"
    for item in "${mismatched[@]}"; do
      IFS='|' read -r name local_ver pub_ver <<< "$item"
      printf "  %-50s Local: %s | Published: %s\n" "$name" "$local_ver" "$pub_ver"
    done
  fi

  if [[ ${#not_published[@]} -gt 0 ]]; then
    echo ""
    echo "⚠ Not Published (${#not_published[@]}):"
    for item in "${not_published[@]}"; do
      IFS='|' read -r name version <<< "$item"
      printf "  %-50s %s\n" "$name" "$version"
    done
  fi

  if [[ ${#errors[@]} -gt 0 ]]; then
    echo ""
    echo "✗ Errors (${#errors[@]}):"
    for item in "${errors[@]}"; do
      IFS='|' read -r name error <<< "$item"
      printf "  %-50s %s\n" "$name" "$error"
    done
  fi

  echo ""
  echo "=================================================================================="
  printf "Total: %d | Matching: %d | Mismatched: %d | Not Published: %d | Errors: %d\n" \
    ${#extensions[@]} ${#matching[@]} ${#mismatched[@]} ${#not_published[@]} ${#errors[@]}
  echo "=================================================================================="
  echo ""

  # Return non-zero exit code if there are mismatches or errors
  if [[ ${#mismatched[@]} -gt 0 || ${#errors[@]} -gt 0 ]]; then
    return 1
  fi
  return 0
}

# Main function
main() {
  local args=("$@")

  if [[ ${#args[@]} -eq 0 ]]; then
    echo "Error: Extension name is required" >&2
    echo "Usage: $0 <extension-name|*>" >&2
    echo "Example: $0 firestore-genai-chatbot" >&2
    echo "Example: $0 * (check all extensions)" >&2
    exit 1
  fi

  local extension_name="${args[0]}"

  # Check if user wants to check all extensions
  # Handle both literal '*' and when shell expands '*' to many files
  local should_check_all=false
  
  if [[ "$extension_name" == "*" ]]; then
    should_check_all=true
  elif [[ ${#args[@]} -gt 5 ]]; then
    # Many arguments suggests shell expansion
    should_check_all=true
    echo "Note: Detected shell expansion of \"*\". Checking all extensions instead." >&2
    echo "" >&2
  elif [[ "$extension_name" == *.* ]]; then
    # File extensions suggest shell expansion
    should_check_all=true
    echo "Note: Detected shell expansion of \"*\". Checking all extensions instead." >&2
    echo "" >&2
  elif [[ ! -f "$ROOT_DIR/$extension_name/extension.yaml" ]]; then
    # Not a valid extension directory
    should_check_all=true
    echo "Note: \"$extension_name\" is not a valid extension. Checking all extensions instead." >&2
    echo "" >&2
  fi

  if [[ "$should_check_all" == true ]]; then
    check_all_extensions
    exit $?
  fi

  echo ""
  echo "Checking version for extension: $extension_name"
  echo ""

  # Get local version
  local local_version
  if ! local_version=$(get_local_version "$extension_name"); then
    echo "✗ Error: $local_version" >&2
    exit 1
  fi
  echo "✓ Local version (extension.yaml):  $local_version"

  # Get published version
  local published_version
  if ! published_version=$(get_published_version "$extension_name"); then
    echo "✗ Error: $published_version" >&2
    exit 1
  fi
  echo "✓ Published version (registry):    $published_version"

  # Compare versions
  echo ""
  echo "=================================================="
  if [[ "$local_version" == "$published_version" ]]; then
    echo "✓ Versions match! Extension is up to date."
    echo "=================================================="
    echo ""
    exit 0
  else
    echo "⚠ Version mismatch detected!"
    echo "  Local:     $local_version"
    echo "  Published: $published_version"
    echo "=================================================="
    echo ""
    exit 1
  fi
}

# Run main function with all arguments
main "$@"
