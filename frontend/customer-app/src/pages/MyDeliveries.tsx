import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

const ON_UPDATE_DELIVERY = `
  subscription OnUpdateDelivery {
    onUpdateDelivery {
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

const ON_CREATE_DELIVERY = `
  subscription OnCreateDelivery {
    onCreateDelivery {
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
   * Keep the latest callback without making the
   * main loading/subscription effect restart every
   * time the parent renders.
   */
  const callbackRef =
    useRef(onDeliveriesLoaded);

  useEffect(() => {
    callbackRef.current =
      onDeliveriesLoaded;
  }, [onDeliveriesLoaded]);

  /*
   * Load the customer's deliveries.
   */
  const loadDeliveries =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        console.log(
          "Loading customer deliveries..."
        );

        const client =
          generateClient();

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
         * Notify the parent after the data has
         * been loaded. This happens inside an
         * effect/callback, not during rendering.
         */
        if (callbackRef.current) {
          callbackRef.current(
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
    }, []);

  /*
   * Initial load + real-time subscriptions.
   */
  useEffect(() => {
    let updateSubscription:
      | any
      | undefined;

    let createSubscription:
      | any
      | undefined;

    let cancelled = false;

    async function start() {
      /*
       * Initial delivery load.
       */
      await loadDeliveries();

      if (cancelled) {
        return;
      }

      const client =
        generateClient();

      console.log(
        "Starting delivery subscription..."
      );

      /*
       * IMPORTANT:
       *
       * Amplify's TypeScript definition can return
       * UnknownGraphQLResponse here. We know these
       * operations are subscriptions, so we cast
       * the result to any before calling subscribe().
       */

      const updateResponse =
        client.graphql({
          query: ON_UPDATE_DELIVERY,
          authMode: "userPool",
        }) as any;

      updateSubscription =
        updateResponse.subscribe({
          next: (event: any) => {
            console.log(
              "REAL-TIME DELIVERY UPDATE:",
              event
            );

            /*
             * Reload the customer's deliveries
             * so the UI always reflects the latest
             * server state.
             */
            loadDeliveries();
          },

          error: (subscriptionError: any) => {
            console.error(
              "Delivery update subscription error:",
              subscriptionError
            );
          },
        });

      /*
       * Listen for newly created deliveries.
       */
      const createResponse =
        client.graphql({
          query: ON_CREATE_DELIVERY,
          authMode: "userPool",
        }) as any;

      createSubscription =
        createResponse.subscribe({
          next: (event: any) => {
            console.log(
              "REAL-TIME DELIVERY CREATED:",
              event
            );

            loadDeliveries();
          },

          error: (subscriptionError: any) => {
            console.error(
              "Delivery creation subscription error:",
              subscriptionError
            );
          },
        });
    }

    start().catch((err) => {
      console.error(
        "Failed to start delivery subscriptions:",
        err
      );
    });

    /*
     * Cleanup when component unmounts.
     */
    return () => {
      cancelled = true;

      console.log(
        "Stopping delivery subscription..."
      );

      if (
        updateSubscription &&
        typeof updateSubscription.unsubscribe ===
          "function"
      ) {
        updateSubscription.unsubscribe();
      }

      if (
        createSubscription &&
        typeof createSubscription.unsubscribe ===
          "function"
      ) {
        createSubscription.unsubscribe();
      }
    };
  }, [loadDeliveries]);

  /*
   * Loading state.
   */
  if (loading) {
    return (
      <section style={styles.section}>
        <h2 style={styles.heading}>
          My Deliveries
        </h2>

        <p style={styles.loading}>
          Loading your deliveries...
        </p>
      </section>
    );
  }

  /*
   * Error state.
   */
  if (error) {
    return (
      <section style={styles.section}>
        <h2 style={styles.heading}>
          My Deliveries
        </h2>

        <div style={styles.error}>
          {error}
        </div>
      </section>
    );
  }

  /*
   * Empty state.
   */
  if (deliveries.length === 0) {
    return (
      <section style={styles.section}>
        <h2 style={styles.heading}>
          My Deliveries
        </h2>

        <div style={styles.empty}>
          You don't have any deliveries yet.
        </div>
      </section>
    );
  }

  /*
   * Delivery list.
   */
  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>
        My Deliveries
      </h2>

      <div style={styles.list}>
        {deliveries.map(
          (delivery) => (
            <div
              key={delivery.deliveryId}
              style={styles.card}
            >
              <div
                style={styles.topRow}
              >
                <strong>
                  Delivery #
                  {delivery.deliveryId.slice(
                    0,
                    8
                  )}
                </strong>

                <span
                  style={{
                    ...styles.status,
                    ...getStatusStyle(
                      delivery.status
                    ),
                  }}
                >
                  {formatStatus(
                    delivery.status
                  )}
                </span>
              </div>

              <div
                style={styles.route}
              >
                <div>
                  <strong>
                    Pickup
                  </strong>

                  <p>
                    {
                      delivery.pickupAddress
                    }
                  </p>
                </div>

                <div>
                  <strong>
                    Destination
                  </strong>

                  <p>
                    {
                      delivery.destinationAddress
                    }
                  </p>
                </div>
              </div>

              <div
                style={styles.details}
              >
                {delivery.estimatedPrice !==
                  null &&
                  delivery.estimatedPrice !==
                    undefined && (
                    <span>
                      $
                      {delivery.estimatedPrice.toFixed(
                        2
                      )}
                    </span>
                  )}

                {delivery.estimatedTime && (
                  <span>
                    {
                      delivery.estimatedTime
                    }
                  </span>
                )}

                <span>
                  {new Date(
                    delivery.createdAt
                  ).toLocaleDateString()}
                </span>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
}

/*
 * Convert enum-style statuses into
 * readable text.
 */
function formatStatus(
  status: string
) {
  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

/*
 * Status colors.
 */
function getStatusStyle(
  status: string
): React.CSSProperties {
  switch (status) {
    case "REQUESTED":
      return {
        background: "#fef3c7",
        color: "#92400e",
      };

    case "ACCEPTED":
      return {
        background: "#dbeafe",
        color: "#1d4ed8",
      };

    case "PICKED_UP":
      return {
        background: "#ede9fe",
        color: "#6d28d9",
      };

    case "IN_TRANSIT":
      return {
        background: "#e0f2fe",
        color: "#0369a1",
      };

    case "DELIVERED":
      return {
        background: "#dcfce7",
        color: "#166534",
      };

    case "CANCELLED":
      return {
        background: "#fee2e2",
        color: "#b91c1c",
      };

    default:
      return {
        background: "#f1f5f9",
        color: "#475569",
      };
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

  heading: {
    fontSize: "28px",
    marginBottom: "20px",
    color: "#111827",
  },

  loading: {
    color: "#64748b",
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "14px",
    padding: "22px",
    boxShadow:
      "0 4px 14px rgba(0, 0, 0, 0.08)",
  },

  topRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },

  status: {
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "capitalize",
  },

  route: {
    display: "grid",
    gridTemplateColumns:
      "1fr 1fr",
    gap: "24px",
    marginBottom: "18px",
  },

  details: {
    display: "flex",
    gap: "20px",
    borderTop:
      "1px solid #e5e7eb",
    paddingTop: "15px",
    color: "#4b5563",
    fontSize: "14px",
  },

  empty: {
    background: "#f3f4f6",
    padding: "24px",
    borderRadius: "12px",
    color: "#4b5563",
  },

  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: "16px",
    borderRadius: "10px",
  },
};