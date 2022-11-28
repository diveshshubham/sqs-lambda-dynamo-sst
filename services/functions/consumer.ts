import AWS from "aws-sdk";
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

export async function handler(event: any) {
  try {
    console.log(event.Records[0].body);
    let body = JSON.parse(event.Records[0].body);

    //when message will be processed sucessfully it will generate a bill successfully
    if (order(body.status, body.expectedPaymentGateway)) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: "bill generated sucessfully" }),
      };
    }
    //first retry after failed message process
    else if (
      body.attempt == 1 &&
      !order(body.status, body.expectedPaymentGateway)
    ) {
      console.log("1st retry");
      let retryCount = JSON.parse(event.Records[0].body);

      retryCount.attempt = 2;
      event.Records[0].body = JSON.stringify(retryCount);
      await handler(event);
    }

    //2nd attempt which will invoke lambda after 60 seconds
    else if (
      body.attempt == 2 &&
      !order(body.status, body.expectedPaymentGateway)
    ) {
      let retryCount = JSON.parse(event.Records[0].body);

      retryCount.attempt = 3;
      event.Records[0].body = JSON.stringify(retryCount);
      await sleep(1);
      console.log("2nd retry");
      await handler(event);
    }
    //3rd attempt which will invoke lambda after 180 seconds
    else if (body.attempt == 3) {
      let retryCount = JSON.parse(event.Records[0].body);

      retryCount.attempt = 4;
      event.Records[0].body = JSON.stringify(retryCount);
      await sleep(2);
      console.log("3rd retry");
      await handler(event);
    }
    //after 3 failed lambda invocation saving the message to ddb
    else if (
      body.attempt == 4 &&
      !order(body.status, body.expectedPaymentGateway)
    ) {
      console.log("saving message");
      let messege = event.Records[0];
      const params = {
        TableName: "failedMessage",
        Item: {
          msgId: new Date().valueOf(),
          messageId: messege.messageId,
          receiptHandle: messege.receiptHandle,
          body: messege.body,
          attributes: JSON.stringify(messege.attributes),
          messageAttributes: messege.messageAttributes,
          md5OfBody: messege.md5OfBody,
          eventSourceARN: messege.eventSourceARN,
          awsRegion: messege.awsRegion,
          createdAt: Date.now(),
        },
      };
      //saving failed message to dynamodb
      await dynamoDb.put(params).promise();

      var deleteParams = {
        QueueUrl:
          "https://sqs.us-east-1.amazonaws.com/447812286091/lambda-queue-Queue",
        ReceiptHandle: event.Records[0].receiptHandle,
      };
      //deleting failed message from queue
      await sqs.deleteMessage(deleteParams).promise();

      throw "failed and message saved in db and deleted from queue";
    }
  } catch (e) {
    console.log(e);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: e + " " + "something went wrong" }),
    };
  }
}

//function which will keep lambda invocation in waiting propotional to numbe of retries
function sleep(retryCount: number) {
  return new Promise((resolve) => {
    let waitingTime = (1.5 ^ retryCount) * 60 * 1000;
    setTimeout(resolve, waitingTime);
  });
}

//function which will fail when it will receive expectedPaymentGateway = false
function order(status: string, expectedPaymentGateway: boolean) {
  const paymentGatewayStatus = expectedPaymentGateway;
  if (paymentGatewayStatus == true && status == "billGenerated") {
    return true;
  } else {
    return false;
  }
}
