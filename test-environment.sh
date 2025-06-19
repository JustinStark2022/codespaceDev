#!/bin/bash

echo "🚀 Kingdom Kids Development Environment Test Suite"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((TESTS_FAILED++))
    fi
}

# Function to print info
print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

echo "🔍 Pre-flight Checks"
echo "===================="

# Check if Docker is available
if command -v docker &> /dev/null; then
    print_result 0 "Docker is installed"
    
    # Check if Docker is running
    if docker info &> /dev/null; then
        print_result 0 "Docker daemon is running"
    else
        print_result 1 "Docker daemon is not running"
        echo "Please start Docker and try again"
        exit 1
    fi
else
    print_result 1 "Docker is not installed"
    echo "Please install Docker and try again"
    exit 1
fi

# Check if Docker Compose is available
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    print_result 0 "Docker Compose is available"
else
    print_result 1 "Docker Compose is not available"
    exit 1
fi

echo ""
echo "🏗️  Build Tests"
echo "==============="

# Test container builds
print_info "Building containers..."
if docker compose build --quiet; then
    print_result 0 "All containers build successfully"
else
    print_result 1 "Container build failed"
fi

echo ""
echo "🚀 Service Tests"
echo "==============="

# Start services in detached mode
print_info "Starting services..."
if docker compose up -d; then
    print_result 0 "Services started successfully"
    
    # Wait for services to be ready
    print_info "Waiting for services to initialize..."
    sleep 30
    
    # Check if services are running
    if docker compose ps | grep -q "Up"; then
        print_result 0 "Services are running"
    else
        print_result 1 "Services failed to start properly"
        docker compose logs
    fi
    
    # Test database connectivity
    print_info "Testing database connectivity..."
    if docker compose exec -T database pg_isready -U postgres &> /dev/null; then
        print_result 0 "Database is accessible"
    else
        print_result 1 "Database is not accessible"
    fi
    
    # Test backend connectivity
    print_info "Testing backend connectivity..."
    sleep 5
    if curl -f -s http://localhost:5000 &> /dev/null || curl -f -s http://localhost:5000/health &> /dev/null; then
        print_result 0 "Backend is responding"
    else
        print_result 1 "Backend is not responding"
        echo "Backend logs:"
        docker compose logs backend | tail -10
    fi
    
    # Test frontend connectivity
    print_info "Testing frontend connectivity..."
    if curl -f -s http://localhost:5173 &> /dev/null; then
        print_result 0 "Frontend is responding"
    else
        print_result 1 "Frontend is not responding"
        echo "Frontend logs:"
        docker compose logs client | tail -10
    fi
    
else
    print_result 1 "Failed to start services"
fi

echo ""
echo "🧹 Cleanup"
echo "=========="

# Stop and remove containers
print_info "Stopping services..."
if docker compose down; then
    print_result 0 "Services stopped successfully"
else
    print_result 1 "Failed to stop services"
fi

echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Your development environment is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run 'docker compose up' to start development"
    echo "2. Access frontend at http://localhost:5173"
    echo "3. Access backend at http://localhost:5000"
    echo "4. Test in GitHub Codespaces by creating a new codespace"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the configuration.${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check Docker logs: docker compose logs"
    echo "2. Verify port availability: lsof -i :5000 -i :5173 -i :5432"
    echo "3. Review TESTING.md for detailed troubleshooting"
    exit 1
fi
