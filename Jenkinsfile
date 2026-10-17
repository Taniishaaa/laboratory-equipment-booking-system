
post {
    always {
        junit testResults: 'selenium-tests/target/surefire-reports/*.xml',
              allowEmptyResults: true

        archiveArtifacts(
            artifacts: 'selenium-tests/target/surefire-reports/**,selenium-tests/target/screenshots/**',
            allowEmptyArchive: true
        )
    }

    success {
        echo 'Pipeline completed successfully.'
    }

    failure {
        echo 'Pipeline failed. Check the stage logs. Deployment was blocked if an earlier stage failed.'
    }
}
