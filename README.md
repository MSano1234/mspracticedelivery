# SwiftDrop AWS Delivery App

A serverless delivery-tracking MVP built with:

- React + Vite
- Amazon API Gateway
- AWS Lambda
- Amazon DynamoDB
- AWS SAM
- AWS Amplify Hosting

## Features

- Create a delivery order
- View all deliveries
- Update delivery status
- Delete a delivery
- Dashboard counters
- Responsive interface

## Architecture

React frontend → API Gateway HTTP API → Lambda → DynamoDB

## Backend deployment

Prerequisites:

- AWS CLI configured
- AWS SAM CLI installed
- Node.js 20+

From the project root:

```bash
cd backend
sam build
sam deploy --guided
```

Recommended guided deployment answers:

- Stack Name: `swiftdrop-api`
- AWS Region: your preferred region
- Confirm changes before deploy: `Y`
- Allow SAM CLI IAM role creation: `Y`
- Disable rollback: `N`
- Save arguments to configuration file: `Y`

After deployment, copy the `ApiUrl` output.

## Frontend setup

```bash
cd frontend
npm install
copy .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com
```

Run locally:

```bash
npm run dev
```

## Deploy frontend

1. Push this repository to GitHub.
2. Open AWS Amplify.
3. Choose **Deploy an app**.
4. Connect your GitHub repository.
5. Set the app root to `frontend`.
6. Add environment variable `VITE_API_URL`.
7. Deploy.

## API routes

- `GET /deliveries`
- `POST /deliveries`
- `PATCH /deliveries/{id}`
- `DELETE /deliveries/{id}`
