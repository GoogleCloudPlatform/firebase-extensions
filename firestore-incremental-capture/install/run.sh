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
export DATABASE_ID=""
export DATABASE_LOCATION="nam5"
export LOCATION="us-central1"
export EXT_INSTANCE_ID="firestore-incremental-capture"
export JAR_PATH="restore-firestore.jar"

source ./functions/download_restore_firestore.sh
source ./functions/enable_pitr.sh
source ./functions/setup_firestore.sh
source ./functions/setup_artifact_registry.sh
source ./functions/setup_service_account.sh
source ./functions/build_dataflow_template.sh

# Print success messages
echo -e "${Green}All steps completed successfully!${NC}"
for TASK in "${SUCCESS_TASKS[@]}"; do
  echo -e "$TASK"
done