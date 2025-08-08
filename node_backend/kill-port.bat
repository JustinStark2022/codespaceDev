@echo off
echo Finding process using port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
  echo Found process: %%a
  echo Terminating process...
  taskkill /F /PID %%a
  echo Process terminated
  exit /b 0
)
echo No process found using port 3001
