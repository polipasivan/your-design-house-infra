import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

interface DesignDetailsBody {
  name: string;
  email: string;
}

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function validateBody(body: unknown): body is DesignDetailsBody {
  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.name !== 'string' || obj.name.trim() === '') {
    return false;
  }

  if (typeof obj.email !== 'string' || obj.email.trim() === '') {
    return false;
  }

  return true;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (!event.body) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Request body is required' }),
    };
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

  if (!validateBody(parsedBody)) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: 'Invalid request body. Expected: { name: string, email: string }',
      }),
    };
  }

  const id = randomUUID();
  const timestamp = new Date().toISOString();

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          id,
          name: parsedBody.name.trim(),
          email: parsedBody.email.trim(),
          createdAt: timestamp,
        },
      })
    );
  } catch (error) {
    console.error('DynamoDB error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to save design details' }),
    };
  }

  return {
    statusCode: 201,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      message: 'Design details saved successfully',
      id,
      timestamp,
    }),
  };
};
