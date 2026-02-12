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
            ToAddresses: [email],
          },
          Message: {
            Subject: {
              Data: 'Thank you for your design details',
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: `<h1>Hello ${name},</h1><p>Thank you for submitting your design details. We have received your information and will be in touch soon.</p>`,
                Charset: 'UTF-8',
              },
              Text: {
                Data: `Hello ${name}, Thank you for submitting your design details. We have received your information and will be in touch soon.`,
                Charset: 'UTF-8',
              },
            },
          },
        })
      );

      console.log(`Email sent successfully to ${email}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}:`, error);
      throw error;
    }
  }
};
