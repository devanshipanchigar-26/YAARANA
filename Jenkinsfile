
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

        stage('Start React App') {
            steps {
                bat 'npm run dev -- --host 127.0.0.1'
            }
        }
    }

    post {
        success {
            echo 'Yaarana Cafe application started successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Console Output.'
        }
    }
}
