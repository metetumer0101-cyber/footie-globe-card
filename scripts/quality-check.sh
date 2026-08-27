#!/bin/bash

# Quality Check Script
# Run all quality checks before committing

set -e

echo "🔍 Running quality checks..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# 1. TypeScript Check
echo "1️⃣  TypeScript type checking..."
if bun run typecheck; then
  echo -e "${GREEN}✓ TypeScript check passed${NC}"
else
  echo -e "${RED}✗ TypeScript check failed${NC}"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# 2. ESLint
echo "2️⃣  ESLint code analysis..."
if bun run lint; then
  echo -e "${GREEN}✓ ESLint check passed${NC}"
else
  echo -e "${YELLOW}⚠ ESLint found issues${NC}"
  # Don't fail on lint warnings
fi
echo ""

# 3. Prettier
echo "3️⃣  Prettier formatting check..."
if bun run format:check; then
  echo -e "${GREEN}✓ Prettier check passed${NC}"
else
  echo -e "${YELLOW}⚠ Prettier found formatting issues${NC}"
  echo "   Run 'bun run format' to fix"
fi
echo ""

# 4. Build
echo "4️⃣  Production build..."
if bun run build; then
  echo -e "${GREEN}✓ Build successful${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  FAILURES=$((FAILURES + 1))
fi
echo ""

# Summary
echo "================================"
if [ $FAILURES -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILURES check(s) failed${NC}"
  exit 1
fi
