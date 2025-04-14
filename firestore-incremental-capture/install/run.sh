#!/bin/bash

# Define color codes for better readability
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export NC='\033[0m'
export TICK="✓"

# Initialize an empty array to hold success messages
export SUCCESS_TASKS=()

# Define variables at the top
export PROJECT_ID=""
# Default fallback suffix (will be updated by detect_default_bucket)
export DEFAULT_BUCKET_SUFFIX=".appspot.com"
export DATABASE_ID=""
export DATABASE_LOCATION="nam5"
export LOCATION="us-central1"
export EXT_INSTANCE_ID="firestore-incremental-capture"
export JAR_PATH="restore-firestore.jar"

# Detect default bucket suffix automatically
detect_default_bucket() {
  echo "Detecting default storage bucket..."
  
  # Try to list buckets and check which suffix exists
  local buckets=$(gcloud storage buckets list --project=$PROJECT_ID --format="value(name)")
  
  # Check for both possible bucket names
  if echo "$buckets" | grep -q "$PROJECT_ID.appspot.com"; then
    echo "Detected .appspot.com bucket (pre-September 2024)"
    DEFAULT_BUCKET_SUFFIX=".appspot.com"
  elif echo "$buckets" | grep -q "$PROJECT_ID.firebasestorage.app"; then
    echo "Detected .firebasestorage.app bucket (post-September 2024)"
    DEFAULT_BUCKET_SUFFIX=".firebasestorage.app"
  else
    echo -e "${YELLOW}Warning: Could not detect default bucket, using .firebasestorage.app as fallback${NC}"
    DEFAULT_BUCKET_SUFFIX=".firebasestorage.app"
  fi
  
  echo "Using bucket: $PROJECT_ID$DEFAULT_BUCKET_SUFFIX"
}

# Call the detect function after PROJECT_ID is set
# For example: export PROJECT_ID=$(gcloud config get-value project)
detect_default_bucket

source ./functions/download_restore_firestore.sh
source ./functions/enable_pitr.sh
source ./functions/setup_firestore.sh
source ./functions/setup_artifact_registry.sh
source ./functions/setup_service_account.sh
source ./functions/build_dataflow_template.sh

# Print success messages
echo -e "${GREEN}All steps completed successfully!${NC}"
for TASK in "${SUCCESS_TASKS[@]}"; do
  echo -e "$TASK"
done