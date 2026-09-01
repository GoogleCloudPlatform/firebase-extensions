# Pinned to a release tag, never to a branch. POSTINSTALL of every published
# extension version links users to this script on main, so a moving URL would
# hand an old install a pipeline build it was never tested against.
# Bump PIPELINE_RELEASE and PIPELINE_SHA256 together, in the same extension
# version bump that ships the new pipeline.
PIPELINE_RELEASE="firestore-incremental-capture-pipeline-v0.1.0"
PIPELINE_SHA256="REPLACE_WITH_RELEASE_DIGEST"

PIPELINE_URL="https://github.com/GoogleCloudPlatform/firebase-extensions/releases/download/${PIPELINE_RELEASE}/restore-firestore.jar"

echo -e "${YELLOW}Downloading the JAR file (${PIPELINE_RELEASE})...${NC}"

# Deleting the jar on every failure is what makes this fail closed: run.sh
# keeps sourcing the remaining steps, and a leftover download would let the
# Flex Template build stage an unverified pipeline before the failure surfaces.
download_failed() {
  echo -e "${RED}$1${NC}"
  FAILED_TASKS+=("${RED}${CROSS} Failed to download assets.")
  rm -f restore-firestore.jar
}

# This file is sourced by run.sh, so it must return rather than exit - an exit
# here would skip every remaining setup step and still report success.
if ! curl -fsSL -o restore-firestore.jar "$PIPELINE_URL"; then
  download_failed "Failed to download the JAR from ${PIPELINE_URL}."
elif [ "$PIPELINE_SHA256" = "REPLACE_WITH_RELEASE_DIGEST" ]; then
  download_failed "No pinned checksum is configured for ${PIPELINE_RELEASE}; refusing to use the download."
elif ! echo "${PIPELINE_SHA256}  restore-firestore.jar" | shasum -a 256 -c - >/dev/null 2>&1; then
  download_failed "Checksum mismatch: ${PIPELINE_URL} does not match the digest pinned in this extension version."
else
  echo -e "${GREEN}JAR file downloaded and verified.${NC}"
  SUCCESS_TASKS+=("${GREEN}${TICK} Successfully downloaded assets.")
fi
