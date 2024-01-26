# Check if Firestore database already exists
echo -e "${YELLOW}Step 2: Setting up Firestore database${NC}"
DB_EXISTS=$(gcloud alpha firestore databases list --project=$PROJECT_ID --format="value(name)")

if echo "$DB_EXISTS" | grep -q "projects/$PROJECT_ID/databases/$DATABASE_ID"; then
  echo -e "${GREEN}Firestore database already exists, skipping creation.${NC}"
else
  # Create secondary Firestore database
  echo -e "${GREEN}Creating secondary Firestore database...${NC}"
  gcloud alpha firestore databases create --database=$DATABASE_ID --location=$DATABASE_LOCATION --type=firestore-native --project=$PROJECT_ID
  echo -e "${GREEN}Firestore database created successfully.${NC}"
fi

  SUCCESS_TASKS+=("${GREEN}${TICK} Database setup successfully")