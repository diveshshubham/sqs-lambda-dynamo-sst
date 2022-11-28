import AWS from "aws-sdk";
import { Queue } from "@serverless-stack/node/queue";

const sqs = new AWS.SQS();
console.log(Queue.Queue.queueUrl, "klkkl");

export async function main(event: any) {
  //Send a message to queue

  //failing 5 messages
  for (let i = 0; i < 6; i++) {
    await sqs
      .sendMessage({
        // Get the queue url from the environment variable
        QueueUrl: Queue.Queue.queueUrl,
        MessageBody: `{"status":"billGenerated","attempt":1,"expectedPaymentGateway":false}`,
      })
      .promise();
  }
  //sending  20 success messages
  for (let i = 0; i < 21; i++) {
    await sqs //success message
      .sendMessage({
        // Get the queue url from the environment variable
        QueueUrl: Queue.Queue.queueUrl,
        MessageBody: `{"status":"billGenerated","attempt":1,"expectedPaymentGateway":true}`,
      })
      .promise();
  }

  console.log("Message queued!");

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "successful queued 20 success and 5 failed messages",
    }),
  };
}
