import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  },
  body: JSON.stringify(body)
});

const parseBody = (event) => {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
};

export const handler = async (event) => {
  const method = event.requestContext?.http?.method;
  const path = event.rawPath;
  const id = event.pathParameters?.id;

  try {
    if (method === "GET" && path === "/deliveries") {
      const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
      const deliveries = (result.Items || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      return response(200, deliveries);
    }

    if (method === "POST" && path === "/deliveries") {
      const body = parseBody(event);

      if (!body) return response(400, { message: "Invalid JSON body." });

      const required = ["customerName", "pickupAddress", "dropoffAddress"];
      const missing = required.filter((field) => !body[field]?.trim());

      if (missing.length) {
        return response(400, {
          message: `Missing required fields: ${missing.join(", ")}`
        });
      }

      const now = new Date().toISOString();
      const delivery = {
        id: crypto.randomUUID(),
        customerName: body.customerName.trim(),
        phone: body.phone?.trim() || "",
        pickupAddress: body.pickupAddress.trim(),
        dropoffAddress: body.dropoffAddress.trim(),
        packageDescription: body.packageDescription?.trim() || "",
        driverName: body.driverName?.trim() || "Unassigned",
        status: "Pending",
        createdAt: now,
        updatedAt: now
      };

      await client.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: delivery
      }));

      return response(201, delivery);
    }

    if (method === "PATCH" && id) {
      const body = parseBody(event);
      const allowedStatuses = [
        "Pending",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Cancelled"
      ];

      if (!body?.status || !allowedStatuses.includes(body.status)) {
        return response(400, { message: "A valid status is required." });
      }

      const result = await client.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": body.status,
          ":updatedAt": new Date().toISOString()
        },
        ReturnValues: "ALL_NEW"
      }));

      if (!result.Attributes) {
        return response(404, { message: "Delivery not found." });
      }

      return response(200, result.Attributes);
    }

    if (method === "DELETE" && id) {
      await client.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id }
      }));
      return response(200, { message: "Delivery deleted." });
    }

    return response(404, { message: "Route not found." });
  } catch (error) {
    console.error(error);
    return response(500, { message: "Internal server error." });
  }
};
