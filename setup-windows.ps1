# Windows PowerShell setup script for testing frameworks
Write-Host "Setting up testing frameworks for Kingdom Kids app..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Setup Frontend Testing (client directory)
Write-Host "Setting up frontend testing..." -ForegroundColor Yellow
Set-Location client

# Install Vitest and React Testing Library for frontend
npm install --save-dev vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Create vitest config
@"
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
"@ | Out-File -FilePath "vitest.config.ts" -Encoding UTF8

# Create test setup file
New-Item -ItemType Directory -Force -Path "src/test"
@"
import '@testing-library/jest-dom'
"@ | Out-File -FilePath "src/test/setup.ts" -Encoding UTF8

# Create missing page components for testing
New-Item -ItemType Directory -Force -Path "src/pages"

# Check if Settings.tsx exists, if not create it
if (-not (Test-Path "src/pages/Settings.tsx")) {
    @"
export default function Settings() {
  return <div>Settings Page</div>
}
"@ | Out-File -FilePath "src/pages/Settings.tsx" -Encoding UTF8
}

# Check if Support.tsx exists, if not create it
if (-not (Test-Path "src/pages/Support.tsx")) {
    @"
export default function Support() {
  return <div>Support Page</div>
}
"@ | Out-File -FilePath "src/pages/Support.tsx" -Encoding UTF8
}

# Create a simple test file
@"
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('Simple Test', () => {
  it('should pass basic test', () => {
    const div = document.createElement('div')
    div.textContent = 'Hello World'
    expect(div.textContent).toBe('Hello World')
  })
})
"@ | Out-File -FilePath "src/test/simple.test.tsx" -Encoding UTF8

# Add test scripts to package.json
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
npm pkg set scripts.test:ui="vitest --ui"

Write-Host "Frontend testing setup complete!" -ForegroundColor Green

# Setup Backend Testing (node_backend directory)
Write-Host "Setting up backend testing..." -ForegroundColor Yellow
Set-Location ../node_backend

# Install Jest and Supertest for backend
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Create Jest config for ESM modules
@"
export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      useESM: true
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapper: {
    '^(\.{1,2}/.*)\\.js$': '$1',
  },
}
"@ | Out-File -FilePath "jest.config.mjs" -Encoding UTF8

# Create test setup file
New-Item -ItemType Directory -Force -Path "src/test"
@"
// Test setup file for backend
process.env.NODE_ENV = 'test'
"@ | Out-File -FilePath "src/test/setup.ts" -Encoding UTF8

# Create a simple test file
@"
describe('Simple Backend Test', () => {
  it('should pass basic test', () => {
    const result = 2 + 2
    expect(result).toBe(4)
  })

  it('should test environment variable', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
"@ | Out-File -FilePath "src/test/simple.test.ts" -Encoding UTF8

# Add test scripts to package.json
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:coverage="jest --coverage"

Write-Host "Backend testing setup complete!" -ForegroundColor Green

# Go back to root directory
Set-Location ..

Write-Host "Testing frameworks installed successfully!" -ForegroundColor Green
Write-Host "Frontend: Vitest + React Testing Library" -ForegroundColor Cyan
Write-Host "Backend: Jest + Supertest" -ForegroundColor Cyan
Write-Host "" 
Write-Host "To run tests:" -ForegroundColor Yellow
Write-Host "Frontend: cd client && npm test" -ForegroundColor White
Write-Host "Backend: cd node_backend && npm test" -ForegroundColor White
