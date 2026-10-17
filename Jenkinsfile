
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
                bat '''
                    @echo off
                    if not exist "%DEPLOY_DIR%" mkdir "%DEPLOY_DIR%"
                    if errorlevel 1 exit /b 1

                    xcopy "frontend\\dist\\*" "%DEPLOY_DIR%\\" /E /I /Y
                    if errorlevel 1 exit /b 1

                    echo Frontend deployed to %DEPLOY_DIR%
                '''
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }
    }
}
