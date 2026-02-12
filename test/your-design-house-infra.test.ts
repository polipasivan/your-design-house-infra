import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { YourDesignHouseInfraStack } from '../lib/your-design-house-infra-stack';

describe('YourDesignHouseInfraStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new YourDesignHouseInfraStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('Creates Lambda Function', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'writeToDynamo',
      Runtime: 'nodejs20.x',
    });
  });

  test('Creates API Gateway REST API', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Your Design House API',
    });
  });

  test('API Gateway has rate limiting configured', () => {
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
      StageName: 'prod',
      MethodSettings: [
        {
          HttpMethod: '*',
          ResourcePath: '/*',
          ThrottlingRateLimit: 10,
          ThrottlingBurstLimit: 20,
        },
      ],
    });
  });

  test('POST method is unauthenticated', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      AuthorizationType: 'NONE',
    });
  });

  test('Does not create Cognito resources', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 0);
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 0);
    template.resourceCountIs('AWS::ApiGateway::Authorizer', 0);
  });

  test('Creates DynamoDB table', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'confessions',
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      BillingMode: 'PAY_PER_REQUEST',
    });
  });

  test('Lambda has TABLE_NAME environment variable', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'writeToDynamo',
      Environment: {
        Variables: {
          NODE_OPTIONS: '--enable-source-maps',
          TABLE_NAME: Match.anyValue(),
        },
      },
    });
  });

  test('Lambda has write permissions to DynamoDB', () => {
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'dynamodb:BatchWriteItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:DescribeTable',
            ],
            Effect: 'Allow',
          },
        ],
      },
    });
  });
});
