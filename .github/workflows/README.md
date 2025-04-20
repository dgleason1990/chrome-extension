# Chrome Web Store Deployment

This GitHub Actions workflow automatically builds and deploys your Chrome extension to the Chrome Web Store when changes are pushed to the main branch.

## Required Secrets

To use this workflow, you need to set up the following secrets in your GitHub repository:

1. **EXTENSION_ID**: The ID of your Chrome extension from the Chrome Web Store
2. **CLIENT_ID**: OAuth client ID from Google Cloud Platform
3. **CLIENT_SECRET**: OAuth client secret from Google Cloud Platform
4. **REFRESH_TOKEN**: OAuth refresh token for authentication

## Setup Instructions

### 1. Create a Chrome Web Store Developer Account

If you don't have one already, create a [Chrome Web Store Developer Account](https://chrome.google.com/webstore/developer/dashboard) and pay the one-time registration fee.

### 2. Upload Your Extension Manually (First Time)

For the first deployment, you need to manually upload your extension to get an EXTENSION_ID.

### 3. Set Up Google Cloud Platform OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Chrome Web Store API
4. Create OAuth credentials:
   - Create an OAuth client ID
   - Application type: Web application
   - Add authorized redirect URIs (e.g., https://developers.google.com/oauthplayground)

### 4. Get a Refresh Token

1. Go to [OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon and check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. Select the Chrome Web Store API v1.1 scope: `https://www.googleapis.com/auth/chromewebstore`
5. Click "Exchange authorization code for tokens" to get a refresh token

### 5. Add Secrets to GitHub

In your GitHub repository, go to Settings > Secrets and add:

- EXTENSION_ID: Your extension ID from the Chrome Web Store
- CLIENT_ID: Your OAuth client ID
- CLIENT_SECRET: Your OAuth client secret
- REFRESH_TOKEN: The refresh token from step 4

## Usage

The workflow will run automatically when you push to the main branch. You can also trigger it manually from the "Actions" tab in your GitHub repository.
