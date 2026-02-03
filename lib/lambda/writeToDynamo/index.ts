import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Extract user information from the Cognito authorizer context
  const claims = event.requestContext.authorizer?.claims;
  const userId = claims?.sub || 'unknown';

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      message: 'Successfully processed request',
      userId: userId,
      timestamp: new Date().toISOString(),
    }),
  };
};
