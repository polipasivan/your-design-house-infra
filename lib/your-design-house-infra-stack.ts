import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

export class YourDesignHouseInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // 1. DYNAMODB TABLE
    // ========================================
    const confessionsTable = new dynamodb.Table(this, 'ConfessionsTable', {
      tableName: 'confessions',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const designDetailsTable = new dynamodb.Table(this, 'DesignDetailsTable', {
      tableName: 'design-details',
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
    });

    // ========================================
    // 2. LAMBDA FUNCTION
    // ========================================
    const writeToDynamoFunction = new lambdaNodejs.NodejsFunction(this, 'WriteToDynamoFunction', {
      functionName: 'writeToDynamo',
      entry: path.join(__dirname, 'lambda', 'writeToDynamo', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: confessionsTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        forceDockerBundling: false,
      },
    });

    // Grant Lambda write permissions to DynamoDB
    confessionsTable.grantWriteData(writeToDynamoFunction);

    const designDetailsFunction = new lambdaNodejs.NodejsFunction(this, 'DesignDetailsFunction', {
      functionName: 'designDetails',
      entry: path.join(__dirname, 'lambda', 'designDetails', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        TABLE_NAME: designDetailsTable.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        forceDockerBundling: false,
      },
    });

    designDetailsTable.grantWriteData(designDetailsFunction);

    const sendEmailFunction = new lambdaNodejs.NodejsFunction(this, 'SendEmailFunction', {
      functionName: 'sendEmail',
      entry: path.join(__dirname, 'lambda', 'sendEmail', 'index.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        SENDER_EMAIL: 'yoursbyemily@gmail.com',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        forceDockerBundling: false,
      },
    });

    sendEmailFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['ses:SendEmail', 'ses:SendRawEmail'],
        resources: ['*'],
      })
    );

    sendEmailFunction.addEventSource(
      new lambdaEventSources.DynamoEventSource(designDetailsTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 1,
        retryAttempts: 3,
      })
    );

    // ========================================
    // 3. API GATEWAY WITH RATE LIMITING
    // ========================================
    const api = new apigateway.RestApi(this, 'YourDesignHouseApi', {
      restApiName: 'Your Design House API',
      description: 'API for Your Design House application',
      deployOptions: {
        stageName: 'prod',
        // Rate limiting to protect writes
        throttlingRateLimit: 10,  // 10 requests per second
        throttlingBurstLimit: 20, // Allow burst up to 20 requests
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // /writeToDynamo endpoint (unauthenticated with rate limiting)
    const writeToDynamoResource = api.root.addResource('writeToDynamo');

    writeToDynamoResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(writeToDynamoFunction, {
        proxy: true,
      }),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
      }
    );

    // /design-details endpoint
    const designDetailsResource = api.root.addResource('design-details');

    designDetailsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(designDetailsFunction, {
        proxy: true,
      }),
      {
        authorizationType: apigateway.AuthorizationType.NONE,
      }
    );

    // ========================================
    // 4. CLOUDFORMATION OUTPUTS
    // ========================================
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'YourDesignHouseApiUrl',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: `${api.url}writeToDynamo`,
      description: 'Full endpoint URL for writeToDynamo',
      exportName: 'WriteToDynamoEndpoint',
    });

    new cdk.CfnOutput(this, 'DesignDetailsEndpoint', {
      value: `${api.url}design-details`,
      description: 'Full endpoint URL for design-details',
      exportName: 'DesignDetailsEndpoint',
    });
  }
}
