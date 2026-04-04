#!/bin/bash
# YouTube Video Suggestion System - Installation & Verification Script

echo "=========================================="
echo "YouTube Video Suggestion System"
echo "Installation & Verification Guide"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}1. Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi

# Check npm
echo -e "\n${BLUE}2. Checking npm installation...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: v$NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi

# Check project structure
echo -e "\n${BLUE}3. Verifying project structure...${NC}"

directories=(
    "server/services"
    "server/routes"
    "src/components"
    "src/hooks"
    "src/types"
    "supabase/migrations"
    "docs"
)

for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${GREEN}✓ $dir exists${NC}"
    else
        echo -e "${RED}✗ $dir missing${NC}"
    fi
done

# Check files
echo -e "\n${BLUE}4. Checking required files...${NC}"

files=(
    "server/api.js"
    "server/services/keywordExtractor.js"
    "server/services/youtubeSearch.js"
    "server/routes/videoSuggestions.js"
    "src/components/VideoSuggestionReview.tsx"
    "src/components/YouTubeEmbed.tsx"
    "src/hooks/useVideoSuggestions.ts"
    "src/types/videoSuggestions.ts"
    "supabase/migrations/20260214_video_suggestions_schema.sql"
    ".env.example"
    "docs/START_HERE.md"
    "docs/README_VIDEO_SUGGESTIONS.md"
    "docs/YOUTUBE_SUGGESTIONS_SETUP.md"
    "docs/INTEGRATION_EXAMPLES.tsx"
    "docs/TESTING_GUIDE.ts"
    "docs/PROJECT_SUMMARY.md"
)

missing_files=0
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        echo -e "${RED}✗ $file MISSING${NC}"
        ((missing_files++))
    fi
done

if [ $missing_files -eq 0 ]; then
    echo -e "\n${GREEN}All files present!${NC}"
else
    echo -e "\n${RED}$missing_files files missing. Please re-run setup.${NC}"
    exit 1
fi

# Check environment file
echo -e "\n${BLUE}5. Checking environment configuration...${NC}"

if [ -f ".env.local" ]; then
    if grep -q "YOUTUBE_API_KEY" .env.local; then
        echo -e "${GREEN}✓ .env.local exists with YOUTUBE_API_KEY${NC}"
    else
        echo -e "${YELLOW}⚠ .env.local exists but YOUTUBE_API_KEY not set${NC}"
    fi
else
    echo -e "${YELLOW}⚠ .env.local not found. Create from .env.example${NC}"
    echo -e "${YELLOW}  Copy .env.example to .env.local and add your API keys${NC}"
fi

# Check package.json scripts
echo -e "\n${BLUE}6. Checking npm scripts...${NC}"

if grep -q "\"start:api\"" package.json; then
    echo -e "${GREEN}✓ start:api script found${NC}"
else
    echo -e "${RED}✗ start:api script not found${NC}"
fi

if grep -q "\"dev\"" package.json; then
    echo -e "${GREEN}✓ dev script found${NC}"
else
    echo -e "${RED}✗ dev script not found${NC}"
fi

# Summary
echo -e "\n${BLUE}=========================================="
echo "Installation Summary"
echo "==========================================${NC}"
echo -e ""
echo -e "${GREEN}✓ All system files are in place${NC}"
echo -e ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Get YouTube API Key (console.cloud.google.com)"
echo -e "2. Copy .env.example to .env.local"
echo -e "3. Add YOUTUBE_API_KEY to .env.local"
echo -e "4. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY"
echo -e "5. Run database migration in Supabase"
echo -e "6. Install dependencies: npm install express cors dotenv axios"
echo -e "7. Start backend: npm run start:api"
echo -e "8. Start frontend: npm run dev (in another terminal)"
echo -e "9. Visit: http://localhost:5173/admin/videos"
echo -e ""
echo -e "${BLUE}Documentation:${NC}"
echo -e "• Start here: docs/START_HERE.md"
echo -e "• Quick start: docs/README_VIDEO_SUGGESTIONS.md"
echo -e "• Full setup: docs/YOUTUBE_SUGGESTIONS_SETUP.md"
echo -e "• Examples: docs/INTEGRATION_EXAMPLES.tsx"
echo -e "• Tests: docs/TESTING_GUIDE.ts"
echo -e ""
echo -e "${GREEN}Installation verification complete! ✓${NC}"
echo -e ""
