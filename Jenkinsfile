pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
    }

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
                dir('backend') {
                    bat '''
                        @echo off
                        echo ===== Backend dependencies =====
                        call npm ci
                        if errorlevel 1 exit /b 1

                        echo ===== Prisma validation =====
                        call npx prisma validate
                        if errorlevel 1 exit /b 1

                        echo ===== Generate Prisma Client =====
                        call npx prisma generate
                        if errorlevel 1 exit /b 1
                    '''
                }
                dir('frontend') {
                    bat '''
                        @echo off
                        echo ===== Frontend dependencies =====
                        call npm ci
                        if errorlevel 1 exit /b 1

                        echo ===== Frontend production build =====
                        call npm run build
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }

        stage('Prepare Test Database') {
            steps {
                dir('backend') {
                    bat '''
                        @echo off
                        echo ===== Apply database migrations =====
                        call npx prisma migrate deploy
                        if errorlevel 1 exit /b 1

                        echo ===== Seed deterministic test accounts and equipment =====
                        call npm run seed
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }

        stage('Start App') {
            steps {
                // Free ports 3000/4173 in case an earlier run left processes behind.
                bat '''
                    @echo off
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000,4173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 0"
                '''

                // Start-Process with -WorkingDirectory avoids the cmd "start ... cd /d ... ^&^&" quoting
                // problem that caused "The system cannot find the path specified."
                bat '''
                    @echo off
                    echo ===== Starting backend =====
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'npm.cmd' -ArgumentList 'start' -WorkingDirectory (Join-Path $env:WORKSPACE 'backend') -RedirectStandardOutput (Join-Path $env:WORKSPACE 'backend-test.log') -RedirectStandardError (Join-Path $env:WORKSPACE 'backend-test.err.log') -WindowStyle Hidden"
                    if errorlevel 1 exit /b 1

                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 30;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:3000/health -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 2 }; if(-not $ready){ Get-Content (Join-Path $env:WORKSPACE 'backend-test.log'),(Join-Path $env:WORKSPACE 'backend-test.err.log') -ErrorAction SilentlyContinue; Write-Error 'Backend did not become healthy at http://127.0.0.1:3000/health'; exit 1 }"
                    if errorlevel 1 exit /b 1
                    echo Backend is healthy.

                    echo ===== Starting Vite preview =====
                    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','preview','--','--host','127.0.0.1','--port','4173' -WorkingDirectory (Join-Path $env:WORKSPACE 'frontend') -RedirectStandardOutput (Join-Path $env:WORKSPACE 'preview.log') -RedirectStandardError (Join-Path $env:WORKSPACE 'preview.err.log') -WindowStyle Hidden"
                    if errorlevel 1 exit /b 1

                    powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 20;$i++){ try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173 -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break} } catch {}; Start-Sleep -Seconds 2 }; if(-not $ready){ Get-Content (Join-Path $env:WORKSPACE 'preview.log'),(Join-Path $env:WORKSPACE 'preview.err.log') -ErrorAction SilentlyContinue; Write-Error 'Frontend preview did not become ready at http://127.0.0.1:4173'; exit 1 }"
                    if errorlevel 1 exit /b 1
                    echo Frontend preview is ready.
                '''
            }
        }

        stage('Selenium Tests') {
            steps {
                dir('selenium-tests') {
                    bat '''
                        @echo off
                        echo ===== Running Selenium tests =====
                        call mvn -B clean test -DbaseUrl=http://127.0.0.1:4173
                        if errorlevel 1 exit /b 1
                    '''
                }
            }
        }

        stage('Package') {
            steps {
                archiveArtifacts artifacts: 'frontend/dist/**', fingerprint: true
            }
        }

        // Only reached when every Selenium test passed: a failed test fails the
        // 'Selenium Tests' stage, so Package and Deploy are skipped automatically.
        stage('Deploy') {
            steps {
                script {
                    def deployDir = params.DEPLOY_DIR?.trim()
                    if (!deployDir) {
                        error('DEPLOY_DIR parameter cannot be empty.')
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

    post {
        always {
            // Runs on success AND failure, so the report and failure screenshots are always published.
            junit testResults: 'selenium-tests/target/surefire-reports/*.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'selenium-tests/target/screenshots/**,selenium-tests/target/surefire-reports/**,backend-test*.log,preview*.log', allowEmptyArchive: true

            // Stop the backend and preview servers so the next run starts clean.
            bat '''
                @echo off
                powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000,4173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; exit 0"
            '''
        }
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs and the Test Result page.'
        }
    }
}