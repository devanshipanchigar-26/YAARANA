
pipeline {
    agent any

    environment {
        PATH = "C:\\Program Files\\nodejs;${env.PATH}"
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Source code retrieved from GitHub.'
            }
        }

        stage('Check Node.js and npm') {
            steps {
                bat 'node --version'
                bat 'npm --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm install'
            }
        }

        stage('Build React App') {
            steps {
                bat 'npm run build'
            }
        }
    }

    post {
        success {
            echo 'Yaarana Cafe website built successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
