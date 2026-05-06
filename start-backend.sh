#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_DIR="$SCRIPT_DIR/python"
VENV_PATH="$PYTHON_DIR/venv"

echo "🚀 Starting AstroUnified Backend..."

if [ ! -d "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found at $VENV_PATH"
    echo "Please run: cd python && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Kill any existing process on port 8001
EXISTING_PID=$(lsof -t -i:8001)
if [ ! -z "$EXISTING_PID" ]; then
    echo "Stopping existing process on port 8001 (PID: $EXISTING_PID)..."
    kill -9 $EXISTING_PID
fi

# Start uvicorn using the venv's python interpreter explicitly
echo "Starting server with venv python..."
cd "$PYTHON_DIR"
exec "$VENV_PATH/bin/python" -m uvicorn main:app --reload --port 8001
