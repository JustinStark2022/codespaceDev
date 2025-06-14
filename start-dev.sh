#!/bin/bash

# Start both frontend and backend in development mode
echo "Starting Kingdom Kids Development Environment..."

# Function to cleanup background processes
cleanup() {
    echo "Shutting down applications..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo "Starting backend on port 5000..."
cd node_backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "Starting frontend on port 5173..."
cd client
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Applications started successfully!"
echo "🔗 Frontend: http://localhost:5173"
echo "🔗 Backend API: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both applications"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
