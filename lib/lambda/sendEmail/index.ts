import { DynamoDBStreamEvent } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb';

const sesClient = new SESClient({});
const SENDER_EMAIL = process.env.SENDER_EMAIL!;

export const handler = async (event: DynamoDBStreamEvent): Promise<void> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    if (record.eventName !== 'INSERT') {
      continue;
    }

    if (!record.dynamodb?.NewImage) {
      console.warn('No NewImage found in record');
      continue;
    }

    const item = unmarshall(
      record.dynamodb.NewImage as Record<string, AttributeValue>
    );

    const { email, name } = item;

    if (!email) {
      console.warn('No email found in record, skipping');
      continue;
    }

    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: SENDER_EMAIL,
          Destination: {
            ToAddresses: ['yoursbyemily@gmail.com'],
          },
          Message: {
            Subject: {
              Data: 'Email From Prospective Client',
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: `<p>Client: ${name} with email: ${email}</p>`,
                Charset: 'UTF-8',
              },
              Text: {
                Data: `Client: ${name} with email: ${email}`,
                Charset: 'UTF-8',
              },
            },
          },
        })
      );

      console.log(`Email sent successfully to yoursbyemily@gmail.com`);
    } catch (error) {
      console.error(`Failed to send email to yoursbyemily@gmail.com:`, error);
      throw error;
    }
  }
};
