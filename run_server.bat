@echo off
title Wiki-Router Server Runner
echo Starting Node.js Server...
cd /d "C:\Users\55341\Desktop\Wiki-Router"

:: node_modules가 없는 경우 자동 설치 (선택 사항)
if not exist node_modules (
    echo [INFO] Installing dependencies...
    npm install
)

:: 서버 실행
node server.js
pause