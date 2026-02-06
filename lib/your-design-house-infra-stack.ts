import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class YourDesignHouseInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // 1. LAMBDA FUNCTION
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
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        forceDockerBundling: false,
      },
    });

    // ========================================
    // 2. API GATEWAY WITH RATE LIMITING
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

    // ========================================
    // 3. CLOUDFORMATION OUTPUTS
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
  }
}
