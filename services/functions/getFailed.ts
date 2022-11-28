import AWS from "aws-sdk";

import { Table } from "@serverless-stack/node/table";
const dynamoDb = new AWS.DynamoDB.DocumentClient();
export async function main(event: any) {
  try {
    let limit = event.queryStringParameters.limit;
    var params = {
      TableName: "failedMessage",
      Limit: limit,
      ScanIndexForward: false,
      FilterExpression: "#timestamp < :from", 
      ExpressionAttributeNames: {
        "#timestamp": "createdAt",
      },
      ExpressionAttributeValues: {
        ":from": Date.now(),
      },
    };
    var result = await dynamoDb.scan(params).promise();
    // console.log(JSON.parse(result));
    return { statusCode: 200, body: result };
  } catch (error) {
    console.error(error);
  }
}
