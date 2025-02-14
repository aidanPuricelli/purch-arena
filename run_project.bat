@echo off
cd /d "%~dp0"

:: Check if node_modules exists in the root directory, if not, run npm install
if not exist "node_modules" (
    echo node_modules not found. Running npm install...
    npm install
)

:: Start frontend
start cmd /k "npm run start"

:: Navigate to server directory
cd server

:: Start server
start cmd /k "node server.js"
