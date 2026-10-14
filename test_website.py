
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/devanshipanchigar-26/YAARANA.git'
            }
        }

        stage('Check Tools') {
            steps {
                bat 'node --version'
                bat 'npm --version'
                bat '"C:\\Users\\blv\\AppData\\Local\\Programs\\Python\\Python313\\python.exe" --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
                bat '"C:\\Users\\blv\\AppData\\Local\\Programs\\Python\\Python313\\python.exe" -m pip install selenium'
            }
        }

        stage('Build Website') {
            steps {
                bat 'npm run build'
            }
        }

        stage('Start Website') {
            steps {
                bat 'start "" /B cmd /c "npm run dev -- --host 127.0.0.1 > vite.log 2>&1"'

                bat '''
                powershell -NoProfile -Command "$ready=$false; for ($i=0; $i -lt 30; $i++) { try { Invoke-WebRequest http://127.0.0.1:5173/login -UseBasicParsing | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 1 } }; if (-not $ready) { Get-Content vite.log; exit 1 }"
                '''
            }
        }

        stage('Selenium Testing') {
            steps {
                bat '"C:\\Users\\blv\\AppData\\Local\\Programs\\Python\\Python313\\python.exe" -u test_website.py'
            }
        }
    }

    post {
        always {
            echo 'Jenkins pipeline execution finished.'
        }

        success {
            echo 'Yaarana Cafe website build and Selenium testing completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check Console Output for the exact error.'
        }
    }
}
