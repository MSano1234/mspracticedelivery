import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";

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

const ON_DELIVERY_UPDATED = `
  subscription OnDeliveryUpdated {
    onDeliveryUpdated {
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

type MyDeliveriesProps = {
  onDeliveriesLoaded?: (
    deliveries: Delivery[]
  ) => void;
};

const STATUS_STAGES = [
  "REQUESTED",
  "ACCEPTED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
];

export default function MyDeliveries({
  onDeliveriesLoaded,
}: MyDeliveriesProps) {
  const [deliveries, setDeliveries] =
    useState<Delivery[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Load customer deliveries
   */
  const loadDeliveries = async () => {
    try {
      setLoading(true);
      setError("");

      console.log(
        "Loading customer deliveries..."
      );

      const client = generateClient();

      const result: any =
        await client.graphql({
          query: MY_DELIVERIES,
          authMode: "userPool",
        });

      console.log(
        "My deliveries response:",
        result
      );

      const loadedDeliveries: Delivery[] =
        result.data?.myDeliveries ?? [];

      console.log(
        "Customer deliveries:",
        loadedDeliveries
      );

      setDeliveries(
        loadedDeliveries
      );

      /*
       * Notify Home after loading,
       * outside the state updater.
       */
      if (onDeliveriesLoaded) {
        onDeliveriesLoaded(
          loadedDeliveries
        );
      }
    } catch (err) {
      console.error(
        "Failed to load deliveries:",
        err
      );

      setError(
        "Unable to load your deliveries."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial load
   */
  useEffect(() => {
    loadDeliveries();
  }, []);

  /*
   * Real-time AppSync subscription
   */
  useEffect(() => {
    const client = generateClient();

    console.log(
      "Starting delivery subscription..."
    );

    const subscription =
      client.graphql({
        query:
          ON_DELIVERY_UPDATED,
        authMode: "userPool",
      }).subscribe({
        next: ({
          data,
        }: any) => {
          const updatedDelivery =
            data?.onDeliveryUpdated;

          console.log(
            "REAL-TIME DELIVERY UPDATE:",
            updatedDelivery
          );

          if (!updatedDelivery) {
            return;
          }

          /*
           * IMPORTANT:
           * Do not call onDeliveriesLoaded()
           * inside the setDeliveries updater.
           */
          setDeliveries(
            (currentDeliveries) => {
              const exists =
                currentDeliveries.some(
                  (delivery) =>
                    delivery.deliveryId ===
                    updatedDelivery.deliveryId
                );

              /*
               * Ignore deliveries that are not
               * already in this customer's list.
               */
              if (!exists) {
                return currentDeliveries;
              }

              return currentDeliveries.map(
                (delivery) =>
                  delivery.deliveryId ===
                  updatedDelivery.deliveryId
                    ? updatedDelivery
                    : delivery
              );
            }
          );
        },

        error: (
          subscriptionError: any
        ) => {
          console.error(
            "Delivery subscription error:",
            subscriptionError
          );
        },

        complete: () => {
          console.log(
            "Delivery subscription closed."
          );
        },
      });

    /*
     * Cleanup subscription when component
     * unmounts.
     */
    return () => {
      console.log(
        "Stopping delivery subscription..."
      );

      subscription.unsubscribe();
    };
  }, []);

  /*
   * Keep Home.tsx informed whenever
   * the delivery state changes.
   *
   * This happens AFTER React updates
   * the deliveries state.
   */
  useEffect(() => {
    if (onDeliveriesLoaded) {
      onDeliveriesLoaded(
        deliveries
      );
    }
  }, [
    deliveries,
    onDeliveriesLoaded,
  ]);

  /*
   * Loading
   */
  if (loading) {
    return (
      <section
        style={styles.section}
      >
        <div
          style={
            styles.headingRow
          }
        >
          <div>
            <p
              style={
                styles.eyebrow
              }
            >
              DELIVERY ACTIVITY
            </p>

            <h2
              style={
                styles.heading
              }
            >
              My Deliveries
            </h2>
          </div>
        </div>

        <p
          style={styles.loading}
        >
          Loading your deliveries...
        </p>
      </section>
    );
  }

  /*
   * Error
   */
  if (error) {
    return (
      <section
        style={styles.section}
      >
        <div
          style={
            styles.headingRow
          }
        >
          <div>
            <p
              style={
                styles.eyebrow
              }
            >
              DELIVERY ACTIVITY
            </p>

            <h2
              style={
                styles.heading
              }
            >
              My Deliveries
            </h2>
          </div>
        </div>

        <div
          style={styles.error}
        >
          {error}
        </div>

        <button
          type="button"
          onClick={
            loadDeliveries
          }
          style={
            styles.retryButton
          }
        >
          Try Again
        </button>
      </section>
    );
  }

  /*
   * Empty
   */
  if (deliveries.length === 0) {
    return (
      <section
        style={styles.section}
      >
        <div
          style={
            styles.headingRow
          }
        >
          <div>
            <p
              style={
                styles.eyebrow
              }
            >
              DELIVERY ACTIVITY
            </p>

            <h2
              style={
                styles.heading
              }
            >
              My Deliveries
            </h2>
          </div>
        </div>

        <div
          style={styles.empty}
        >
          <div
            style={
              styles.emptyIcon
            }
          >
            📦
          </div>

          <h3
            style={
              styles.emptyTitle
            }
          >
            No deliveries yet
          </h3>

          <p
            style={
              styles.emptyText
            }
          >
            Your delivery requests
            will appear here.
          </p>
        </div>
      </section>
    );
  }

  /*
   * Main
   */
  return (
    <section
      style={styles.section}
    >
      <div
        style={
          styles.headingRow
        }
      >
        <div>
          <p
            style={
              styles.eyebrow
            }
          >
            DELIVERY ACTIVITY
          </p>

          <h2
            style={
              styles.heading
            }
          >
            My Deliveries
          </h2>
        </div>

        <button
          type="button"
          onClick={
            loadDeliveries
          }
          style={
            styles.refreshButton
          }
        >
          Refresh
        </button>
      </div>

      <div
        style={styles.list}
      >
        {deliveries.map(
          (delivery) => (
            <DeliveryCard
              key={
                delivery.deliveryId
              }
              delivery={
                delivery
              }
            />
          )
        )}
      </div>
    </section>
  );
}

/*
 * Delivery Card
 */
function DeliveryCard({
  delivery,
}: {
  delivery: Delivery;
}) {
  const currentStage =
    getCurrentStage(
      delivery.status
    );

  const statusInfo =
    getStatusInfo(
      delivery.status
    );

  return (
    <article
      style={styles.card}
    >
      {/* Header */}

      <div
        style={styles.topRow}
      >
        <div>
          <span
            style={
              styles.deliveryLabel
            }
          >
            DELIVERY
          </span>

          <strong
            style={
              styles.deliveryId
            }
          >
            #
            {delivery.deliveryId.slice(
              0,
              8
            )}
          </strong>
        </div>

        <span
          style={{
            ...styles.status,
            background:
              statusInfo.background,
            color:
              statusInfo.color,
          }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Current status */}

      <div
        style={{
          ...styles.statusMessage,
          background:
            statusInfo.background,
        }}
      >
        <span
          style={
            styles.statusIcon
          }
        >
          {statusInfo.icon}
        </span>

        <div>
          <strong
            style={{
              color:
                statusInfo.color,
            }}
          >
            {statusInfo.title}
          </strong>

          <p
            style={
              styles.statusDescription
            }
          >
            {
              statusInfo.description
            }
          </p>
        </div>
      </div>

      {/* Progress */}

      <div
        style={
          styles.progressContainer
        }
      >
        {STATUS_STAGES.map(
          (
            stage,
            index
          ) => {
            const stageIndex =
              STATUS_STAGES.indexOf(
                stage
              );

            const completed =
              stageIndex <=
              currentStage;

            const isLast =
              index ===
              STATUS_STAGES.length -
                1;

            return (
              <div
                key={stage}
                style={
                  styles.stageWrapper
                }
              >
                <div
                  style={
                    styles.stageItem
                  }
                >
                  <div
                    style={{
                      ...styles.stageCircle,
                      background:
                        completed
                          ? "#2563eb"
                          : "#e5e7eb",
                      color:
                        completed
                          ? "#ffffff"
                          : "#94a3b8",
                    }}
                  >
                    {completed
                      ? "✓"
                      : index + 1}
                  </div>

                  <span
                    style={{
                      ...styles.stageLabel,
                      color:
                        completed
                          ? "#111827"
                          : "#94a3b8",
                    }}
                  >
                    {formatStage(
                      stage
                    )}
                  </span>
                </div>

                {!isLast && (
                  <div
                    style={{
                      ...styles.progressLine,
                      background:
                        stageIndex <
                        currentStage
                          ? "#2563eb"
                          : "#e5e7eb",
                    }}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Route */}

      <div
        style={styles.route}
      >
        <div
          style={
            styles.routePoint
          }
        >
          <div
            style={
              styles.pickupDot
            }
          >
            ●
          </div>

          <div>
            <span
              style={
                styles.routeLabel
              }
            >
              PICKUP
            </span>

            <p
              style={
                styles.address
              }
            >
              {
                delivery.pickupAddress
              }
            </p>
          </div>
        </div>

        <div
          style={
            styles.routeLine
          }
        />

        <div
          style={
            styles.routePoint
          }
        >
          <div
            style={
              styles.destinationDot
            }
          >
            ●
          </div>

          <div>
            <span
              style={
                styles.routeLabel
              }
            >
              DESTINATION
            </span>

            <p
              style={
                styles.address
              }
            >
              {
                delivery.destinationAddress
              }
            </p>
          </div>
        </div>
      </div>

      {/* Driver information */}

      <div
        style={
          styles.driverSection
        }
      >
        <div
          style={
            styles.driverInfo
          }
        >
          <span
            style={
              styles.infoLabel
            }
          >
            DRIVER
          </span>

          <strong>
            {delivery.driverId
              ? "Driver assigned"
              : "Waiting for driver"}
          </strong>
        </div>

        <div
          style={
            styles.driverInfo
          }
        >
          <span
            style={
              styles.infoLabel
            }
          >
            ETA
          </span>

          <strong>
            {
              delivery.estimatedTime ??
              "—"
            }
          </strong>
        </div>

        <div
          style={
            styles.driverInfo
          }
        >
          <span
            style={
              styles.infoLabel
            }
          >
            PRICE
          </span>

          <strong>
            {delivery.estimatedPrice !==
              null &&
            delivery.estimatedPrice !==
              undefined
              ? `$${delivery.estimatedPrice.toFixed(
                  2
                )}`
              : "—"}
          </strong>
        </div>
      </div>

      {/* Tracking */}

      <div
        style={
          styles.mapPreview
        }
      >
        {delivery.status ===
          "IN_TRANSIT" &&
        delivery.driverLatitude !==
          null &&
        delivery.driverLatitude !==
          undefined &&
        delivery.driverLongitude !==
          null &&
        delivery.driverLongitude !==
          undefined ? (
          <>
            <div
              style={
                styles.mapGrid
              }
            />

            <div
              style={
                styles.driverMarker
              }
            >
              🚚
            </div>

            <div
              style={
                styles.mapLabel
              }
            >
              Live driver location
            </div>
          </>
        ) : (
          <div
            style={
              styles.mapPlaceholder
            }
          >
            <span
              style={
                styles.mapIcon
              }
            >
              🗺️
            </span>

            <strong>
              Live tracking
            </strong>

            <p>
              {getTrackingMessage(
                delivery.status
              )}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}

      <div
        style={styles.footer}
      >
        <span>
          Created{" "}
          {new Date(
            delivery.createdAt
          ).toLocaleDateString()}
        </span>

        <span>
          Updated{" "}
          {new Date(
            delivery.updatedAt
          ).toLocaleTimeString(
            [],
            {
              hour: "numeric",
              minute: "2-digit",
            }
          )}
        </span>
      </div>
    </article>
  );
}

/*
 * Determine current stage
 */
function getCurrentStage(
  status: string
) {
  const index =
    STATUS_STAGES.indexOf(
      status
    );

  return index === -1
    ? 0
    : index;
}

/*
 * Status information
 */
function getStatusInfo(
  status: string
) {
  switch (status) {
    case "REQUESTED":
      return {
        label: "REQUESTED",
        title:
          "Looking for a driver",
        description:
          "Your delivery request has been submitted.",
        icon: "📦",
        background: "#fef3c7",
        color: "#92400e",
      };

    case "ACCEPTED":
      return {
        label: "ACCEPTED",
        title:
          "Driver accepted",
        description:
          "A driver has accepted your delivery request.",
        icon: "🚗",
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    case "PICKED_UP":
      return {
        label: "PICKED UP",
        title:
          "Package picked up",
        description:
          "Your driver has picked up the delivery.",
        icon: "📦",
        background: "#e0e7ff",
        color: "#4338ca",
      };

    case "IN_TRANSIT":
      return {
        label: "IN TRANSIT",
        title:
          "Your delivery is on the way",
        description:
          "Your driver is currently heading to the destination.",
        icon: "🚚",
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    case "DELIVERED":
      return {
        label: "DELIVERED",
        title:
          "Delivery completed",
        description:
          "Your delivery has been successfully completed.",
        icon: "✓",
        background: "#dcfce7",
        color: "#166534",
      };

    case "CANCELLED":
      return {
        label: "CANCELLED",
        title:
          "Delivery cancelled",
        description:
          "This delivery has been cancelled.",
        icon: "×",
        background: "#fee2e2",
        color: "#b91c1c",
      };

    default:
      return {
        label: formatStatus(
          status
        ),
        title:
          "Delivery status",
        description:
          "Your delivery status has been updated.",
        icon: "📦",
        background: "#f3f4f6",
        color: "#374151",
      };
  }
}

/*
 * Tracking message
 */
function getTrackingMessage(
  status: string
) {
  switch (status) {
    case "REQUESTED":
      return "A driver will appear here once your delivery is accepted.";

    case "ACCEPTED":
      return "Your driver has accepted the delivery.";

    case "PICKED_UP":
      return "Your package has been picked up.";

    case "DELIVERED":
      return "Your delivery has been completed.";

    case "CANCELLED":
      return "Tracking is unavailable because this delivery was cancelled.";

    default:
      return "Live driver location will appear here.";
  }
}

/*
 * Format status
 */
function formatStatus(
  status: string
) {
  return status
    .replace(
      /_/g,
      " "
    )
    .toUpperCase();
}

/*
 * Format progress stage
 */
function formatStage(
  stage: string
) {
  switch (stage) {
    case "REQUESTED":
      return "Requested";

    case "ACCEPTED":
      return "Accepted";

    case "PICKED_UP":
      return "Picked Up";

    case "IN_TRANSIT":
      return "In Transit";

    case "DELIVERED":
      return "Delivered";

    default:
      return stage;
  }
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  section: {
    marginTop: "40px",
    marginBottom: "40px",
  },

  headingRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  eyebrow: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 700,
    color: "#2563eb",
    letterSpacing: "1px",
  },

  heading: {
    fontSize: "28px",
    margin:
      "6px 0 0",
    color: "#111827",
  },

  loading: {
    color: "#64748b",
  },

  refreshButton: {
    border:
      "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    padding:
      "9px 16px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },

  list: {
    display: "flex",
    flexDirection:
      "column",
    gap: "20px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "24px",
    boxShadow:
      "0 4px 14px rgba(0, 0, 0, 0.08)",
  },

  topRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "18px",
  },

  deliveryLabel: {
    display: "block",
    fontSize: "11px",
    color: "#64748b",
    fontWeight: 700,
    letterSpacing:
      "0.8px",
    marginBottom: "4px",
  },

  deliveryId: {
    display: "block",
    fontSize: "20px",
    color: "#111827",
  },

  status: {
    padding:
      "7px 13px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
  },

  statusMessage: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "15px",
    borderRadius: "10px",
    marginBottom: "24px",
  },

  statusIcon: {
    fontSize: "25px",
  },

  statusDescription: {
    margin:
      "4px 0 0",
    color: "#4b5563",
    fontSize: "13px",
  },

  progressContainer: {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: "28px",
    overflowX: "auto",
  },

  stageWrapper: {
    display: "flex",
    alignItems: "flex-start",
    flex: 1,
    minWidth: "95px",
  },

  stageItem: {
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    gap: "7px",
    minWidth: "75px",
  },

  stageCircle: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
  },

  stageLabel: {
    fontSize: "11px",
    fontWeight: 600,
    textAlign: "center",
    whiteSpace:
      "nowrap",
  },

  progressLine: {
    height: "3px",
    flex: 1,
    marginTop: "14px",
  },

  route: {
    marginBottom: "24px",
  },

  routePoint: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  pickupDot: {
    color: "#2563eb",
    fontSize: "18px",
  },

  destinationDot: {
    color: "#111827",
    fontSize: "18px",
  },

  routeLabel: {
    display: "block",
    fontSize: "10px",
    color: "#64748b",
    fontWeight: 700,
    letterSpacing:
      "0.7px",
    marginBottom: "4px",
  },

  address: {
    margin: 0,
    color: "#111827",
    fontSize: "14px",
    lineHeight: 1.5,
  },

  routeLine: {
    height: "24px",
    width: "1px",
    background: "#d1d5db",
    marginLeft: "7px",
  },

  driverSection: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr 1fr",
    gap: "15px",
    borderTop:
      "1px solid #e5e7eb",
    borderBottom:
      "1px solid #e5e7eb",
    padding:
      "18px 0",
  },

  driverInfo: {
    display: "flex",
    flexDirection:
      "column",
    gap: "5px",
  },

  infoLabel: {
    fontSize: "10px",
    color: "#64748b",
    fontWeight: 700,
    letterSpacing:
      "0.7px",
  },

  mapPreview: {
    height: "190px",
    marginTop: "20px",
    borderRadius: "12px",
    overflow: "hidden",
    position: "relative",
    background:
      "#eef2f7",
    border:
      "1px solid #e5e7eb",
  },

  mapPlaceholder: {
    height: "100%",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    textAlign: "center",
    padding: "20px",
    color: "#64748b",
  },

  mapIcon: {
    fontSize: "32px",
    marginBottom: "7px",
  },

  mapGrid: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(#dbe2ea 1px, transparent 1px), linear-gradient(90deg, #dbe2ea 1px, transparent 1px)",
    backgroundSize:
      "35px 35px",
  },

  driverMarker: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform:
      "translate(-50%, -50%)",
    fontSize: "30px",
  },

  mapLabel: {
    position: "absolute",
    left: "12px",
    bottom: "12px",
    background:
      "rgba(255,255,255,0.95)",
    padding:
      "7px 10px",
    borderRadius: "7px",
    fontSize: "11px",
    color: "#374151",
    fontWeight: 600,
  },

  footer: {
    display: "flex",
    justifyContent:
      "space-between",
    marginTop: "15px",
    color: "#94a3b8",
    fontSize: "11px",
  },

  empty: {
    background: "#f3f4f6",
    padding: "30px",
    borderRadius: "12px",
    color: "#4b5563",
    textAlign: "center",
  },

  emptyIcon: {
    fontSize: "38px",
    marginBottom: "10px",
  },

  emptyTitle: {
    margin:
      "0 0 6px",
    color: "#111827",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
  },

  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "12px",
  },

  retryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding:
      "10px 18px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },
};