import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { YourDesignHouseInfraStack } from '../lib/your-design-house-infra-stack';

describe('YourDesignHouseInfraStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new YourDesignHouseInfraStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  test('Creates Cognito User Pool', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'your-design-house-user-pool',
      AutoVerifiedAttributes: ['email'],
    });
  });

  test('Creates Cognito User Pool Client with OAuth2', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      AllowedOAuthFlows: ['code'],
      AllowedOAuthScopes: ['email', 'openid', 'profile'],
    });
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

  test('Creates Cognito Authorizer', () => {
    template.hasResourceProperties('AWS::ApiGateway::Authorizer', {
      Type: 'COGNITO_USER_POOLS',
      Name: 'CognitoAuthorizer',
    });
  });

  test('POST method uses Cognito authorizer', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      AuthorizationType: 'COGNITO_USER_POOLS',
    });
  });
});
