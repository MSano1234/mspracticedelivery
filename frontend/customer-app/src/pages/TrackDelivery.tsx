import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import { generateClient } from "aws-amplify/api";

import LiveDeliveryMap from "../components/LiveDeliveryMap";

const MY_DELIVERIES = `
  query MyDeliveries {
    myDeliveries {
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
  driverId?: string | null;

  pickupAddress: string;
  destinationAddress: string;

  status: string;

  estimatedPrice?: number | null;
  estimatedTime?: string | null;

  driverLatitude?: number | null;
  driverLongitude?: number | null;

  createdAt: string;
  updatedAt: string;
};

function TrackDelivery() {
  /*
   * Get the delivery ID from:
   *
   * /track-delivery/:deliveryId
   */
  const { deliveryId } =
    useParams<{
      deliveryId: string;
    }>();

  const [delivery, setDelivery] =
    useState<Delivery | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Load the customer's delivery.
   */
  const loadDelivery =
    useCallback(
      async (
        showLoading = false
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError("");

          const client =
            generateClient();

          const result: any =
            await client.graphql({
              query: MY_DELIVERIES,
              authMode: "userPool",
            });

          const deliveries: Delivery[] =
            result.data
              ?.myDeliveries ?? [];

          const currentDelivery =
            deliveries.find(
              (item) =>
                item.deliveryId ===
                deliveryId
            );

          if (!currentDelivery) {
            setError(
              "We couldn't find this delivery."
            );

            setDelivery(null);

            return;
          }

          setDelivery(
            currentDelivery
          );
        } catch (err) {
          console.error(
            "Failed to load delivery:",
            err
          );

          setError(
            "Unable to load your delivery."
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [deliveryId]
    );

  /*
   * Initial load + live polling.
   *
   * We keep the existing 5-second
   * polling system.
   */
  useEffect(() => {
    let cancelled = false;

    const initialize =
      async () => {
        await loadDelivery(true);

        if (cancelled) {
          return;
        }
      };

    initialize().catch(
      (err) => {
        console.error(
          "Track delivery initialization error:",
          err
        );
      }
    );

    const intervalId =
      window.setInterval(() => {
        if (!cancelled) {
          loadDelivery(false);
        }
      }, 5000);

    return () => {
      cancelled = true;

      window.clearInterval(
        intervalId
      );
    };
  }, [loadDelivery]);

  /*
   * Loading screen.
   */
  if (loading) {
    return (
      <div className="home-page">

        <header className="navbar">

          <div className="logo">
            SwiftDrop
          </div>

          <Link to="/home">
            Back to Home
          </Link>

        </header>

        <main className="track-container">

          <div
            className="track-header"
            style={{
              textAlign: "center",
              padding:
                "80px 20px",
            }}
          >

            <p className="eyebrow">
              LIVE DELIVERY
            </p>

            <h1>
              Loading your delivery...
            </h1>

          </div>

        </main>

      </div>
    );
  }

  /*
   * Delivery not found / API error.
   */
  if (
    error ||
    !delivery
  ) {
    return (
      <div className="home-page">

        <header className="navbar">

          <div className="logo">
            SwiftDrop
          </div>

          <Link to="/home">
            Back to Home
          </Link>

        </header>

        <main className="track-container">

          <div
            className="track-header"
            style={{
              textAlign: "center",
              padding:
                "80px 20px",
            }}
          >

            <p className="eyebrow">
              LIVE DELIVERY
            </p>

            <h1>
              Delivery unavailable
            </h1>

            <p>
              {error ||
                "We couldn't find this delivery."}
            </p>

            <Link
              to="/home"
              style={{
                display:
                  "inline-block",
                marginTop:
                  "20px",
                padding:
                  "12px 20px",
                borderRadius:
                  "10px",
                background:
                  "#16a34a",
                color:
                  "#ffffff",
                textDecoration:
                  "none",
                fontWeight: 700,
              }}
            >
              Back to Home
            </Link>

          </div>

        </main>

      </div>
    );
  }

  /*
   * Format status.
   */
  const formattedStatus =
    formatStatus(
      delivery.status
    );

  /*
   * Determine whether a driver
   * has been assigned.
   */
  const isSearching =
    delivery.status ===
      "REQUESTED" ||
    !delivery.driverId;

  /*
   * Determine whether driver
   * coordinates exist.
   */
  const hasDriverLocation =
    typeof delivery.driverLatitude ===
      "number" &&
    typeof delivery.driverLongitude ===
      "number";

  /*
   * Timeline state.
   */
  const driverAssigned =
    Boolean(
      delivery.driverId
    );

  const pickedUp =
    delivery.status ===
      "PICKED_UP" ||
    delivery.status ===
      "IN_TRANSIT" ||
    delivery.status ===
      "DELIVERED";

  const inTransit =
    delivery.status ===
    "IN_TRANSIT";

  const delivered =
    delivery.status ===
    "DELIVERED";

  return (
    <div className="home-page">

      {/* =========================
          NAVBAR
      ========================== */}

      <header className="navbar">

        <div className="logo">
          SwiftDrop
        </div>

        <Link to="/home">
          Back to Home
        </Link>

      </header>

      <main className="track-container">

        {/* =========================
            HEADER
        ========================== */}

        <div className="track-header">

          <p className="eyebrow">
            LIVE DELIVERY
          </p>

          <h1>
            Track your delivery
          </h1>

          <p>
            {isSearching
              ? "We're looking for an available driver."
              : "Your delivery is being tracked in real time."}
          </p>

        </div>

        {/* =========================
            ACTIVE DELIVERY
        ========================== */}

        <section className="active-delivery">

          <div className="section-header">

            <div>

              <p className="eyebrow">
                DELIVERY STATUS
              </p>

              <h2>
                {formattedStatus}
              </h2>

            </div>

            <span className="status-badge">

              {isSearching
                ? "Searching"
                : formattedStatus}

            </span>

          </div>

          {/* =========================
              GOOGLE LIVE MAP
          ========================== */}

          <div
            style={{
              width: "100%",
              height: "420px",
              borderRadius:
                "20px",
              overflow: "hidden",
              marginTop:
                "24px",
              border:
                "1px solid #dbe3ef",
            }}
          >

            <LiveDeliveryMap
              deliveryId={
                deliveryId
              }
              pickupAddress={
                delivery.pickupAddress
              }
              destinationAddress={
                delivery.destinationAddress
              }
              driverLatitude={
                delivery.driverLatitude
              }
              driverLongitude={
                delivery.driverLongitude
              }
            />

          </div>

          {/* =========================
              DELIVERY DETAILS
          ========================== */}

          <div className="delivery-info">

            <div className="info-item">

              <span>
                STATUS
              </span>

              <strong>
                {formattedStatus}
              </strong>

            </div>

            <div className="info-item">

              <span>
                ETA
              </span>

              <strong>
                {delivery.estimatedTime ||
                  "—"}
              </strong>

            </div>

            <div className="info-item">

              <span>
                DISTANCE
              </span>

              <strong>
                {hasDriverLocation
                  ? "Tracking"
                  : "—"}
              </strong>

            </div>

          </div>

          {/* =========================
              ROUTE INFORMATION
          ========================== */}

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "20px",
              marginTop:
                "24px",
            }}
          >

            {/* Pickup */}

            <div
              style={{
                padding:
                  "18px",
                borderRadius:
                  "14px",
                background:
                  "#f8fafc",
              }}
            >

              <span
                style={{
                  display:
                    "block",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                  color:
                    "#64748b",
                  marginBottom:
                    "7px",
                }}
              >
                PICKUP
              </span>

              <strong
                style={{
                  color:
                    "#1e293b",
                }}
              >
                {
                  delivery.pickupAddress
                }
              </strong>

            </div>

            {/* Destination */}

            <div
              style={{
                padding:
                  "18px",
                borderRadius:
                  "14px",
                background:
                  "#f8fafc",
              }}
            >

              <span
                style={{
                  display:
                    "block",
                  fontSize:
                    "12px",
                  fontWeight:
                    700,
                  color:
                    "#64748b",
                  marginBottom:
                    "7px",
                }}
              >
                DESTINATION
              </span>

              <strong
                style={{
                  color:
                    "#1e293b",
                }}
              >
                {
                  delivery.destinationAddress
                }
              </strong>

            </div>

          </div>

          {/* =========================
              DELIVERY PRICE
          ========================== */}

          {delivery.estimatedPrice !==
            null &&
            delivery.estimatedPrice !==
              undefined && (

            <div
              style={{
                marginTop:
                  "20px",
                padding:
                  "16px 18px",
                borderRadius:
                  "14px",
                background:
                  "#f0fdf4",
                border:
                  "1px solid #bbf7d0",
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
              }}
            >

              <span
                style={{
                  fontWeight:
                    700,
                  color:
                    "#166534",
                }}
              >
                DELIVERY PRICE
              </span>

              <strong
                style={{
                  fontSize:
                    "20px",
                  color:
                    "#166534",
                }}
              >
                $
                {Number(
                  delivery.estimatedPrice
                ).toFixed(2)}
              </strong>

            </div>

          )}

        </section>

        {/* =========================
            DELIVERY TIMELINE
        ========================== */}

        <section className="delivery-timeline">

          {/* Requested */}

          <div className="timeline-item completed">

            <div className="timeline-dot">
              ✓
            </div>

            <div>

              <strong>
                Delivery requested
              </strong>

              <p>
                Your delivery request has been created.
              </p>

            </div>

          </div>

          {/* Finding Driver */}

          <div
            className={`timeline-item ${
              driverAssigned
                ? "completed"
                : "active"
            }`}
          >

            <div className="timeline-dot">

              {driverAssigned
                ? "✓"
                : "2"}

            </div>

            <div>

              <strong>
                Finding a driver
              </strong>

              <p>
                {driverAssigned
                  ? "A driver has been assigned."
                  : "We're looking for an available driver."}
              </p>

            </div>

          </div>

          {/* Driver Assigned */}

          <div
            className={`timeline-item ${
              pickedUp
                ? "completed"
                : driverAssigned
                ? "active"
                : ""
            }`}
          >

            <div className="timeline-dot">

              {pickedUp
                ? "✓"
                : "3"}

            </div>

            <div>

              <strong>
                Driver assigned
              </strong>

              <p>

                {pickedUp
                  ? "Your driver has picked up the delivery."
                  : driverAssigned
                  ? "Your driver is preparing to pick up the delivery."
                  : "A driver will be assigned to your delivery."}

              </p>

            </div>

          </div>

          {/* Delivered */}

          <div
            className={`timeline-item ${
              delivered
                ? "completed"
                : inTransit
                ? "active"
                : ""
            }`}
          >

            <div className="timeline-dot">

              {delivered
                ? "✓"
                : "4"}

            </div>

            <div>

              <strong>
                Delivered
              </strong>

              <p>

                {delivered
                  ? "Your package has arrived at its destination."
                  : "Your package arrives at its destination."}

              </p>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

/*
 * Format delivery status.
 */
function formatStatus(
  status: string
) {
  return status
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

export default TrackDelivery;