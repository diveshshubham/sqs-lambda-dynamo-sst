import { StackContext, Queue, Api, Table } from "@serverless-stack/resources";

export function MyStack({ stack }: StackContext) {
  // Create Queue
  const queue = new Queue(stack, "Queue", {
    consumer: "functions/consumer.handler",
  });

  // Create the table
  const table = new Table(stack, "failedMessage", {
    fields: {
      messageId: "string",
      receiptHandle: "string",
      body: "string",
      attributes: "string",
      messageAttributes: "string",
      md5OfBody: "string",
      eventSourceARN: "string",
      awsRegion: "string",
      createdAt: "string",
    },
    primaryIndex: { partitionKey: "messageId", sortKey: "createdAt" },
  });

  // Create the HTTP API
  const api = new Api(stack, "Api", {
    defaults: {
      function: {
        // Bind the queue to our API
        bind: [queue],
      },
    },
    routes: {
      "POST /": "functions/lambda.main",
      "GET    /failedMessages": "functions/getFailed.main",
    },
  });

  // Allow the API to access the table
  api.attachPermissions([api]);

  // Show the API endpoint in the output
  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
