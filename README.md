# Your Design House - AWS Infrastructure

Serverless event-driven infrastructure for **Your Design House**, a design consultation business. Built with AWS CDK (TypeScript).

## Architecture

```
                         +-----------------+
                         |  API Gateway    |
                         |  (REST - prod)  |
                         +--------+--------+
                                  |
                    +-------------+-------------+
                    |                           |
          POST /writeToDynamo          POST /design-details
                    |                           |
           +--------v--------+        +--------v--------+
           | writeToDynamo   |        | designDetails   |
           | Lambda          |        | Lambda          |
           +--------+--------+        +--------+--------+
                    |                           |
           +--------v--------+        +--------v--------+
           | confessions     |        | design-details  |
           | DynamoDB Table  |        | DynamoDB Table  |
           +-----------------+        +--------+--------+
                                               |
                                      DynamoDB Stream (INSERT)
                                               |
                                      +--------v--------+
                                      | sendEmail       |
                                      | Lambda          |
                                      +--------+--------+
                                               |
                                      +--------v--------+
                                      | Amazon SES      |
                                      | (Email Notify)  |
                                      +-----------------+
```

## Project Structure

```
.
├── bin/
│   └── your-design-house-infra.ts       # CDK app entry point
├── lib/
│   ├── your-design-house-infra-stack.ts  # Main stack (all AWS resources)
│   └── lambda/
│       ├── writeToDynamo/index.ts        # Confession submission handler
│       ├── designDetails/index.ts        # Design intake form handler
│       └── sendEmail/index.ts            # DynamoDB stream email notifier
├── test/
│   └── your-design-house-infra.test.ts   # CDK stack unit tests
├── cdk.json                              # CDK configuration
├── package.json
└── tsconfig.json
```

## AWS Services

| Service | Resource | Purpose |
|---------|----------|---------|
| **API Gateway** | REST API | Public endpoints with rate limiting (10 req/s, 20 burst) |
| **Lambda** | 3 functions (Node.js 20.x) | Request handling and email notifications |
| **DynamoDB** | 2 tables | Store confessions and design client details |
| **DynamoDB Streams** | Stream on `design-details` | Trigger email Lambda on new inserts |
| **SES** | Email sender | Notify business owner of new prospective clients |

## API Endpoints

### `POST /writeToDynamo`
Accepts confession submissions.

**Request body:**
```json
{
  "confession": "string (required)",
  "email": "string (optional)"
}
```

### `POST /design-details`
Accepts design consultation intake forms. Triggers an email notification to the business owner via DynamoDB Streams + SES.

**Request body:**
```json
{
  "name": "string (required)",
  "email": "string (required)"
}
```

## Lambda Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `writeToDynamo` | API Gateway | Validates and writes confessions to DynamoDB |
| `designDetails` | API Gateway | Validates and writes design client info to DynamoDB |
| `sendEmail` | DynamoDB Stream | Sends email to business owner on new design-details inserts |

All Lambdas: Node.js 20.x, 256 MB memory, 30s timeout, esbuild bundled with source maps.

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run watch` | Watch mode compilation |
| `npm run test` | Run Jest unit tests |
| `npx cdk synth` | Generate CloudFormation template |
| `npx cdk diff` | Compare deployed stack with current state |
| `npx cdk deploy` | Deploy stack to AWS |
