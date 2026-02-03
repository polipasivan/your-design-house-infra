#!/opt/homebrew/opt/node/bin/node
import * as cdk from 'aws-cdk-lib/core';
import { YourDesignHouseInfraStack } from '../lib/your-design-house-infra-stack';

const app = new cdk.App();
new YourDesignHouseInfraStack(app, 'YourDesignHouseInfraStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION 
  },

});
