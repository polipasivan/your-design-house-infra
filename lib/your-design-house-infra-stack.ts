import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class YourDesignHouseInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // 1. COGNITO USER POOL
    // ========================================
    const userPool = new cognito.UserPool(this, 'YourDesignHouseUserPool', {
      userPoolName: 'your-design-house-user-pool',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Cognito Domain for Hosted UI
    const userPoolDomain = userPool.addDomain('CognitoDomain', {
      cognitoDomain: {
        domainPrefix: 'your-design-house',
      },
    });

    // App Client for Web Application (OAuth2 Authorization Code Grant)
    const userPoolClient = userPool.addClient('WebAppClient', {
      userPoolClientName: 'web-app-client',
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: false,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/callback',
        ],
        logoutUrls: [
          'http://localhost:3000/',
        ],
      },
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
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
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node20',
        forceDockerBundling: false,
      },
    });

    // ========================================
    // 3. API GATEWAY WITH COGNITO AUTHORIZER
    // ========================================
    const api = new apigateway.RestApi(this, 'YourDesignHouseApi', {
      restApiName: 'Your Design House API',
      description: 'API for Your Design House application',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: 'CognitoAuthorizer',
      identitySource: 'method.request.header.Authorization',
    });

    // /writeToDynamo endpoint
    const writeToDynamoResource = api.root.addResource('writeToDynamo');

    writeToDynamoResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(writeToDynamoFunction, {
        proxy: true,
      }),
      {
        authorizer: cognitoAuthorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
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

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'YourDesignHouseUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'YourDesignHouseUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: userPoolDomain.domainName,
      description: 'Cognito Domain for Hosted UI',
      exportName: 'YourDesignHouseCognitoDomain',
    });

    new cdk.CfnOutput(this, 'CognitoHostedUIUrl', {
      value: `https://${userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI Base URL',
      exportName: 'YourDesignHouseCognitoHostedUIUrl',
    });
  }
}
