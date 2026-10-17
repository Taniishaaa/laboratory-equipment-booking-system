pipeline {
    agent any

    parameters {
        string(
            name: 'DEPLOY_DIR',
            defaultValue: 'C:\\LabBooking-Deploy',
            description: 'Local directory where the frontend will be deployed'
        )
    }

    environment {
        DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/laboratory_booking?schema=public'
        JWT_SECRET = 'jenkins-test-only-secret-change-before-production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                bat '''
                    @echo off
                    setlocal
                    echo ===== Backend dependencies =====
                    cd backend
                    call npm ci
                    if errorlevel 1 exit /b 1

                    echo ===== Prisma validation =====
                    call npx prisma validate
                    if errorlevel 1 exit /b 1

                    echo ===== Generate Prisma Client =====
                    call npx prisma generate
                    if errorlevel 1 exit /b 1

                    cd ..\frontend
                    echo ===== Frontend dependencies =====
                    call npm ci
                    if errorlevel 1 exit /b 1

                    echo ===== Frontend production build =====
                    call npm run build
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Prepare Test Database') {
            steps {
                bat '''
                    @echo off
                    cd backend
                    echo ===== Apply database migrations =====
                    call npx prisma migrate deploy
                    if errorlevel 1 exit /b 1

                    echo ===== Seed deterministic test accounts and equipment =====
                    call npm run seed
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Start App and Run Selenium Tests') {
            steps {
                bat '''
                    @echo off
                    echo ===== Starting backend =====
                    start "LabBookingAPI" /B cmd.exe /c "cd /d backend ^&^& npm start > backend-test.log 2>&1"
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 40;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 2 }; if(-not $ready){ Get-Content (Join-Path $env:WORKSPACE 'backend-test.log') -ErrorAction SilentlyContinue; throw 'Backend did not become healthy at http://127.0.0.1:3000/health' }"
                    if errorlevel 1 exit /b 1

                    echo ===== Starting Vite preview =====
                    start "VitePreview4173" /B cmd.exe /c "cd /d frontend ^&^& npm.cmd run preview -- --host 127.0.0.1 --port 4173 > preview.log 2>&1"
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173 -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 2 }; if(-not $ready){ Get-Content (Join-Path $env:WORKSPACE 'preview.log') -ErrorAction SilentlyContinue; throw 'Frontend preview did not become ready at http://127.0.0.1:4173' }"
                    if errorlevel 1 exit /b 1

                    echo ===== Running Selenium tests =====
                    cd selenium-tests
                    call mvn -B clean test -DbaseUrl=http://127.0.0.1:4173
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        stage('Publish Test Results') {
            steps {
                junit testResults: 'selenium-tests/target/surefire-reports/*.xml', allowEmptyResults: true
                archiveArtifacts artifacts: 'selenium-tests/target/screenshots/**,backend-test.log,preview.log', allowEmptyArchive: true
            }
        }

        stage('Package') {
            steps {
                archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            steps {
                script {
                    def deployDir = params.DEPLOY_DIR?.trim()
                    if (!deployDir) {
                        error('DEPLOY_DIR parameter cannot be empty.')
                    }
                    if (!(deployDir ==~ /[A-Za-z]:\\[A-Za-z0-9_ .\\-]+/)) {
                        error('DEPLOY_DIR must be a local Windows path, e.g. C:\\LabBooking-Deploy')
                    }
                    withEnv(["DEPLOY_TARGET=${deployDir}"]) {
                        bat '''
                            @echo off
                            echo ===== Deploying frontend =====
                            if not exist "%DEPLOY_TARGET%" mkdir "%DEPLOY_TARGET%"
                            if errorlevel 1 exit /b 1
                            xcopy "frontend\\dist\\*" "%DEPLOY_TARGET%\\" /E /I /Y
                            if errorlevel 1 exit /b 1
                            echo Frontend deployed to %DEPLOY_TARGET%
                        '''
                    }
                }
            }
        }
    }
}
