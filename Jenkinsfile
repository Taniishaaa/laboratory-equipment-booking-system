
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

                    cd ..
                    echo ===== Frontend dependencies =====
                    cd frontend
                    call npm ci
                    if errorlevel 1 exit /b 1

                    echo ===== Frontend production build =====
                    call npm run build
                    if errorlevel 1 exit /b 1
                '''
            }
        }

        

stage('Test') {
    steps {
        script {
            try {
                dir('frontend') {
                    bat '''
                        powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c npm run preview -- --host 127.0.0.1 --port 4173' -WorkingDirectory '%CD%' -WindowStyle Hidden"
                    '''
                }

                bat '''
                    powershell -NoProfile -Command "$deadline=(Get-Date).AddSeconds(60); do { try { $null=Invoke-WebRequest -Uri 'http://127.0.0.1:4173' -TimeoutSec 2; exit 0 } catch { Start-Sleep -Seconds 2 } } while ((Get-Date) -lt $deadline); exit 1"
                    if errorlevel 1 (
                        echo Frontend failed to start. Check port 4173.
                        exit /b 1
                    )
                '''

                dir('selenium-tests') {
                    bat 'mvn clean test'
                }
            } finally {
                bat '''
                    powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue; if($c){Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue}"
                '''
            }
        }
    }
}



        stage('Package') {
            steps {
                archiveArtifacts(
                    artifacts: 'frontend/dist/**',
                    fingerprint: true
                )
            }
        }

        stage('Deploy') {
            steps {
                script {
                    def deployDir = params.DEPLOY_DIR?.trim()

                    if (!deployDir || !(deployDir ==~ /[A-Za-z]:\\.+/)) {
                        error('DEPLOY_DIR must be a valid local Windows path.')
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
            junit(
                testResults: 'selenium-tests/target/surefire-reports/*.xml',
                allowEmptyResults: true
            )

            archiveArtifacts(
                artifacts: 'selenium-tests/target/surefire-reports/**,selenium-tests/target/screenshots/**',
                allowEmptyArchive: true
            )
        }

        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the stage logs. Deployment will not proceed if an earlier stage fails.'
        }
    }
}
