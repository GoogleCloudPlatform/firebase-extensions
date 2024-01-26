echo -e "${YELLOW}Step 1: Enabling PITR as per Google Cloud Console guide${NC}"

gcloud alpha firestore databases create  --location=$LOCATION --project=$PROJECT_ID  --enable-pitr

SUCCESS_TASKS+=("${GREEN}${TICK} Enabled PiTR on (default) database.")