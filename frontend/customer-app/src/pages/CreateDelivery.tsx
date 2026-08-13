import React, { useState } from "react";
import { Link } from "react-router-dom";
import { generateClient } from "aws-amplify/api";

const CREATE_DELIVERY = `
  mutation CreateDelivery($input: CreateDeliveryInput!) {
    createDelivery(input: $input) {
      deliveryId
      customerId
      driverId
      pickupAddress
      destinationAddress
      status
      estimatedPrice
      estimatedTime
      driverLatitude
      driverLongitude
      createdAt
      updatedAt
    }
  }
`;

type Delivery = {
  deliveryId: string;
  customerId: string;
  driverId: string | null;
  pickupAddress: string;
  destinationAddress: string;
  status: string;
  estimatedPrice: number | null;
  estimatedTime: string | null;
  driverLatitude: number | null;
  driverLongitude: number | null;
  createdAt: string;
  updatedAt: string;
};

type GraphQLResult = {
  data?: {
    createDelivery?: Delivery;
  };
  errors?: Array<{
    message: string;
    errorType?: string;
  }>;
};

export default function CreateDelivery() {
  const [pickupAddress, setPickupAddress] =
    useState("");

  const [destinationAddress, setDestinationAddress] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState("");

  const [error, setError] =
    useState("");

  const [createdDelivery, setCreatedDelivery] =
    useState<Delivery | null>(null);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    console.log("=================================");
    console.log(
      "REQUEST DELIVERY BUTTON CLICKED"
    );
    console.log("=================================");

    setError("");
    setSuccess("");
    setCreatedDelivery(null);

    if (!pickupAddress.trim()) {
      setError(
        "Please enter a pickup address."
      );

      console.log(
        "Validation failed: pickup address is empty"
      );

      return;
    }

    if (!destinationAddress.trim()) {
      setError(
        "Please enter a destination address."
      );

      console.log(
        "Validation failed: destination address is empty"
      );

      return;
    }

    setLoading(true);

    try {
      console.log(
        "Sending createDelivery mutation..."
      );

      /*
       * Create the AppSync client here,
       * after Amplify has initialized.
       */
      const client = generateClient();

      const variables = {
        input: {
          pickupAddress:
            pickupAddress.trim(),

          destinationAddress:
            destinationAddress.trim(),

          estimatedPrice: 18.5,

          estimatedTime:
            "25 minutes",
        },
      };

      console.log(
        "Mutation variables:",
        variables
      );

      const response =
        (await client.graphql({
          query: CREATE_DELIVERY,
          variables,
          authMode: "userPool",
        })) as GraphQLResult;

      console.log(
        "RAW APPSYNC RESPONSE:"
      );

      console.log(response);

      if (
        response.errors &&
        response.errors.length > 0
      ) {
        console.error(
          "GraphQL returned errors:",
          response.errors
        );

        setError(
          response.errors
            .map(
              (item) => item.message
            )
            .join(" | ")
        );

        return;
      }

      if (
        !response.data?.createDelivery
      ) {
        console.error(
          "Mutation completed but no createDelivery object was returned."
        );

        setError(
          "The request reached AWS, but no delivery was returned."
        );

        return;
      }

      const delivery =
        response.data.createDelivery;

      console.log(
        "================================="
      );

      console.log(
        "DELIVERY CREATED SUCCESSFULLY"
      );

      console.log(
        "================================="
      );

      console.log(delivery);

      setCreatedDelivery(
        delivery
      );

      setSuccess(
        `Delivery created successfully. Delivery ID: ${delivery.deliveryId}`
      );

      setPickupAddress("");
      setDestinationAddress("");

    } catch (err) {
      console.error(
        "================================="
      );

      console.error(
        "CREATE DELIVERY ERROR"
      );

      console.error(
        "================================="
      );

      console.error(err);

      let message =
        "Unable to create delivery.";

      if (err instanceof Error) {
        message = err.message;
      }

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "40px",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >

        {/* Header */}

        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div>

            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 700,
                color: "#2563eb",
                letterSpacing: "1px",
              }}
            >
              SWIFTDROP
            </p>

            <h1
              style={{
                margin: "8px 0 0",
                fontSize: "32px",
                color: "#111827",
              }}
            >
              Request a Delivery
            </h1>

          </div>

          <Link
            to="/home"
            style={{
              textDecoration:
                "none",
              color: "#2563eb",
              fontWeight: 600,
            }}
          >
            Back to Home
          </Link>

        </div>

        <p
          style={{
            color: "#6b7280",
            marginBottom: "30px",
          }}
        >
          Enter the pickup and destination
          addresses for your delivery.
        </p>

        {/* Success */}

        {success && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: 600,
            }}
          >
            {success}
          </div>
        )}

        {/* Error */}

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "16px",
              borderRadius: "10px",
              marginBottom: "20px",
              fontWeight: 600,
              whiteSpace:
                "pre-wrap",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}

        <form onSubmit={handleSubmit}>

          {/* Pickup */}

          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <label
              htmlFor="pickupAddress"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Pickup Address
            </label>

            <input
              id="pickupAddress"
              type="text"
              value={pickupAddress}
              onChange={(event) =>
                setPickupAddress(
                  event.target.value
                )
              }
              placeholder="123 Main Street, Washington, DC"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: "15px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "16px",
                outline: "none",
              }}
            />
          </div>

          {/* Destination */}

          <div
            style={{
              marginBottom: "22px",
            }}
          >
            <label
              htmlFor="destinationAddress"
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              Destination Address
            </label>

            <input
              id="destinationAddress"
              type="text"
              value={destinationAddress}
              onChange={(event) =>
                setDestinationAddress(
                  event.target.value
                )
              }
              placeholder="456 Market Street, Washington, DC"
              disabled={loading}
              style={{
                width: "100%",
                boxSizing:
                  "border-box",
                padding: "15px",
                border:
                  "1px solid #d1d5db",
                borderRadius: "10px",
                fontSize: "16px",
                outline: "none",
              }}
            />
          </div>

          {/* Estimate */}

          <div
            style={{
              background: "#f9fafb",
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "25px",
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  color: "#6b7280",
                }}
              >
                Estimated price
              </span>

              <strong>
                $18.50
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
              }}
            >
              <span
                style={{
                  color: "#6b7280",
                }}
              >
                Estimated time
              </span>

              <strong>
                25 minutes
              </strong>
            </div>

          </div>

          {/* Submit */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              border: "none",
              borderRadius: "10px",
              background:
                loading
                  ? "#93c5fd"
                  : "#2563eb",
              color: "#ffffff",
              fontSize: "17px",
              fontWeight: 700,
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Creating Delivery..."
              : "Request Delivery"}
          </button>

        </form>

        {/* Created Delivery */}

        {createdDelivery && (
          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              background: "#eff6ff",
              borderRadius: "12px",
            }}
          >

            <h3
              style={{
                marginTop: 0,
                color: "#1e3a8a",
              }}
            >
              Delivery Details
            </h3>

            <p>
              <strong>
                Delivery ID:
              </strong>{" "}
              {
                createdDelivery.deliveryId
              }
            </p>

            <p>
              <strong>
                Status:
              </strong>{" "}
              {
                createdDelivery.status
              }
            </p>

            <p>
              <strong>
                Pickup:
              </strong>{" "}
              {
                createdDelivery.pickupAddress
              }
            </p>

            <p>
              <strong>
                Destination:
              </strong>{" "}
              {
                createdDelivery.destinationAddress
              }
            </p>

            <p>
              <strong>
                Customer ID:
              </strong>{" "}
              {
                createdDelivery.customerId
              }
            </p>

            <p>
              <strong>
                Created:
              </strong>{" "}
              {
                createdDelivery.createdAt
              }
            </p>

          </div>
        )}

      </div>
    </div>
  );
}