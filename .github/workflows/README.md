# GitHub Actions Workflows

## deploy.yml

This workflow automatically builds and deploys the application to a separate `deployment` branch whenever changes are pushed to the `main` branch.

### What it does:

1. **Triggers**: Runs automatically on push to `main` branch
2. **Build**: Installs dependencies and builds the Vite application
3. **Deploy**: Pushes the built files from the `dist` directory to the `deployment` branch

### AWS Amplify Setup:

To host this app with AWS Amplify:

1. In AWS Amplify, create a new app
2. Connect to your GitHub repository
3. Select the `deployment` branch as the source
4. Since the files are already built, configure Amplify to deploy without a build step:
   - Build settings: Use a custom build configuration or disable the build phase
   - The `deployment` branch contains production-ready files

The `deployment` branch will be automatically updated whenever you push to `main`.
