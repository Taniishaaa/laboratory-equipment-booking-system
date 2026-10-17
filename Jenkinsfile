
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
                                @echo off
                                if not exist dist\\index.html (
                                    echo ERROR: Frontend build output is missing.
                                    exit /b 1
                                )

                                if exist preview.log del preview.log

                                start "VitePreview4173" /B cmd.exe /c "npm.cmd run preview -- --host 127.0.0.1 --port 4173 > preview.log 2>&1"
                            '''
                        }

                        bat '''
                            @echo off
                            set "READY=0"

                            for /L %%i in (1,1,30) do (
                                curl.exe --silent --fail http://127.0.0.1:4173/ -o nul
                                if not errorlevel 1 (
                                    set "READY=1"
                                    goto :server_ready
                                )
                                timeout /t 2 /nobreak >nul
                            )

                            :server_ready
                            if "%READY%"=="0" (
                                echo ERROR: Vite Preview did not start.
                                echo ===== Preview log =====
                                type frontend\\preview.log
                                exit /b 1
                            )

                            echo Frontend is ready on port 4173.
                        '''

                        dir('selenium-tests') {
                            bat 'mvn clean test'
                        }
                    } finally {
                        bat '''
                            @echo off
                            powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue; if($c){$c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}"
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
