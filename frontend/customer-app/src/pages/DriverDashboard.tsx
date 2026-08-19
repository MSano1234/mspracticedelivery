import { useCallback, useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";
import {
  fetchUserAttributes,
  getCurrentUser,
  signOut,
} from "aws-amplify/auth";
import { useNavigate } from "react-router-dom";

const LIST_DELIVERIES = `
  query ListDeliveries {
    listDeliveries {
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

const UPDATE_DELIVERY = `
  mutation UpdateDelivery(
    $deliveryId: ID!
    $input: UpdateDeliveryInput!
  ) {
    updateDelivery(
      deliveryId: $deliveryId
      input: $input
    ) {
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

type UpdateDeliveryInput = {
  driverId?: string;
  status?: string;
  estimatedPrice?: number;
  estimatedTime?: string;
  driverLatitude?: number;
  driverLongitude?: number;
};

function DriverDashboard() {
  const navigate = useNavigate();

  const [driverId, setDriverId] = useState("");
  const [driverEmail, setDriverEmail] = useState("");
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeDelivery, setActiveDelivery] =
    useState<Delivery | null>(null);
  const [completedDeliveries, setCompletedDeliveries] =
    useState<Delivery[]>([]);

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [updatingDelivery, setUpdatingDelivery] =
    useState<string | null>(null);

  const [gpsTracking, setGpsTracking] = useState(false);
  const [gpsError, setGpsError] = useState("");

  /*
   * Authenticate user and verify Cognito role.
   *
   * Only:
   *
   * custom:role = driver
   *
   * may access this dashboard.
   */
  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const user = await getCurrentUser();

        console.log("Authenticated user:", user);

        const attributes = await fetchUserAttributes();

        console.log(
          "Authenticated user attributes:",
          attributes
        );

        /*
         * SwiftDrop supports multiple roles on the
         * same Cognito account.
         *
         * Example:
         *
         * custom:roles = "orderer,driver"
         *
         * We also support the legacy:
         *
         * custom:role = "driver"
         */
        const rolesValue =
          attributes["custom:roles"];

        const legacyRole =
          attributes["custom:role"];

        const roles = rolesValue
          ? rolesValue
              .split(",")
              .map((role) =>
                role.trim().toLowerCase()
              )
              .filter(Boolean)
          : legacyRole
            ? [
                legacyRole
                  .trim()
                  .toLowerCase(),
              ]
            : [];

        console.log(
          "SwiftDrop user roles:",
          roles
        );

        /*
         * A driver is authorized when the
         * account contains the driver role.
         */
        if (!roles.includes("driver")) {
          console.log(
            "User is not a driver. Redirecting to customer dashboard."
          );

          navigate("/home", {
            replace: true,
          });

          return;
        }

        /*
         * Valid driver.
         */
        if (!mounted) {
          return;
        }

        setDriverId(user.userId);
        setDriverEmail(attributes["email"] || "");
        setAuthorized(true);
        setLoading(false);
      } catch (authError) {
        console.error(
          "Authentication / role check failed:",
          authError
        );

        navigate("/", {
          replace: true,
        });
      }
    }

    checkAuthentication();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /*
   * Load deliveries.
   */
  const loadDeliveries = useCallback(async () => {
    if (!driverId || !authorized) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(
        "Loading driver deliveries..."
      );

      const client = generateClient();

      const response: any =
        await client.graphql({
          query: LIST_DELIVERIES,
          authMode: "userPool",
        });

      console.log(
        "All deliveries response:",
        response
      );

      const allDeliveries: Delivery[] =
        response.data?.listDeliveries ?? [];

      console.log(
        "ALL DELIVERIES:",
        allDeliveries
      );

      /*
       * Available delivery requests.
       */
      const requestedDeliveries =
        allDeliveries.filter(
          (delivery) =>
            delivery.status === "REQUESTED"
        );

      /*
       * Active deliveries assigned
       * to this driver.
       */
      const myActiveDeliveries =
        allDeliveries.filter(
          (delivery) =>
            delivery.driverId === driverId &&
            [
              "ACCEPTED",
              "PICKED_UP",
              "IN_TRANSIT",
            ].includes(delivery.status)
        );

      /*
       * Completed deliveries assigned
       * to this driver.
       */
      const myCompletedDeliveries =
        allDeliveries.filter(
          (delivery) =>
            delivery.driverId === driverId &&
            delivery.status === "DELIVERED"
        );

      console.log(
        "REQUESTED DELIVERIES:",
        requestedDeliveries
      );

      console.log(
        "MY ACTIVE DELIVERIES:",
        myActiveDeliveries
      );

      console.log(
        "MY COMPLETED DELIVERIES:",
        myCompletedDeliveries
      );

      setDeliveries(requestedDeliveries);

      /*
       * Display first active delivery.
       */
      if (myActiveDeliveries.length > 0) {
        setActiveDelivery(
          myActiveDeliveries[0]
        );
      } else {
        setActiveDelivery(null);
      }

      setCompletedDeliveries(
        myCompletedDeliveries
      );
    } catch (err: any) {
      console.error(
        "FAILED TO LOAD DELIVERIES:",
        JSON.stringify(
          err,
          null,
          2
        )
      );

      console.error(
        "RAW ERROR:",
        err
      );

      let errorMessage =
        "Unable to load deliveries.";

      if (err?.errors?.length > 0) {
        errorMessage =
          err.errors
            .map(
              (item: any) =>
                item.message ||
                JSON.stringify(item)
            )
            .join(" | ");
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [driverId, authorized]);

  /*
   * Load deliveries once authentication
   * and driver role are confirmed.
   *
   * Poll every 5 seconds so new REQUESTED
   * deliveries appear automatically without
   * the driver refreshing the page.
   */
  useEffect(() => {
    if (!driverId || !authorized) {
      return;
    }

    let cancelled = false;

    const refreshDeliveries = async () => {
      if (!cancelled) {
        await loadDeliveries();
      }
    };

    refreshDeliveries();

    const intervalId = window.setInterval(() => {
      refreshDeliveries();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    driverId,
    authorized,
    loadDeliveries,
  ]);

  /*
   * Update delivery.
   */
  const updateDelivery = async (
    deliveryId: string,
    input: UpdateDeliveryInput
  ) => {
    try {
      setUpdatingDelivery(deliveryId);
      setError("");

      console.log(
        "Updating delivery:",
        deliveryId
      );

      console.log(
        "Update input:",
        input
      );

      const client = generateClient();

      const response: any =
        await client.graphql({
          query: UPDATE_DELIVERY,
          variables: {
            deliveryId,
            input,
          },
          authMode: "userPool",
        });

      console.log(
        "Update delivery response:",
        response
      );

      const updatedDelivery =
        response.data?.updateDelivery;

      if (!updatedDelivery) {
        throw new Error(
          "The delivery was not updated."
        );
      }

      console.log(
        "Delivery updated successfully:",
        updatedDelivery
      );

      /*
       * Immediately update active delivery
       * in the UI.
       */
      if (
        updatedDelivery.status !==
        "DELIVERED"
      ) {
        setActiveDelivery(
          updatedDelivery
        );
      } else {
        setActiveDelivery(null);
      }

      /*
       * Reload from AppSync/DynamoDB.
       */
      await loadDeliveries();
    } catch (err: any) {
      console.error(
        "FAILED TO UPDATE DELIVERY:",
        JSON.stringify(
          err,
          null,
          2
        )
      );

      console.error(
        "RAW UPDATE ERROR:",
        err
      );

      let errorMessage =
        "Unable to update delivery.";

      if (err?.errors?.length > 0) {
        errorMessage =
          err.errors
            .map(
              (item: any) =>
                item.message ||
                JSON.stringify(item)
            )
            .join(" | ");
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setUpdatingDelivery(null);
    }
  };

  /*
   * Start live GPS tracking for the active delivery.
   */
  const startGPSTracking = (
    deliveryId: string
  ) => {
    if (!navigator.geolocation) {
      setGpsError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setGpsTracking(true);
    setGpsError("");

    console.log(
      "Starting live GPS tracking for delivery:",
      deliveryId
    );

    const watchId =
      navigator.geolocation.watchPosition(
        async (position) => {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          console.log(
            "Driver GPS location:",
            latitude,
            longitude
          );

          try {
            const client = generateClient();

            const response: any =
              await client.graphql({
                query: UPDATE_DELIVERY,
                variables: {
                  deliveryId,
                  input: {
                    driverLatitude: latitude,
                    driverLongitude: longitude,
                  },
                },
                authMode: "userPool",
              });

            console.log(
              "GPS location saved:",
              response.data?.updateDelivery
            );

            setActiveDelivery((current) => {
              if (
                !current ||
                current.deliveryId !== deliveryId
              ) {
                return current;
              }

              return {
                ...current,
                driverLatitude: latitude,
                driverLongitude: longitude,
              };
            });
          } catch (error) {
            console.error(
              "Failed to save GPS location:",
              error
            );
          }
        },
        (error) => {
          console.error("GPS error:", error);
          setGpsTracking(false);

          switch (error.code) {
            case error.PERMISSION_DENIED:
              setGpsError(
                "Location permission was denied. Please allow location access."
              );
              break;
            case error.POSITION_UNAVAILABLE:
              setGpsError(
                "Your current location is unavailable."
              );
              break;
            case error.TIMEOUT:
              setGpsError(
                "Location request timed out."
              );
              break;
            default:
              setGpsError(
                "Unable to access your location."
              );
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000,
        }
      );

    (window as any).swiftDropGPSWatchId = watchId;
  };

  /*
   * Accept delivery.
   */
  const handleAcceptDelivery = async (
    deliveryId: string
  ) => {
    if (!driverId) {
      return;
    }

    await updateDelivery(
      deliveryId,
      {
        driverId,
        status: "ACCEPTED",
      }
    );
  };

  /*
   * Mark picked up.
   */
  const handlePickedUp = async () => {
    if (!activeDelivery) {
      return;
    }

    await updateDelivery(
      activeDelivery.deliveryId,
      {
        status: "PICKED_UP",
      }
    );
  };

  /*
   * Start delivery.
   */
  const handleStartDelivery =
    async () => {
      if (!activeDelivery) {
        return;
      }

      const deliveryId =
        activeDelivery.deliveryId;

      await updateDelivery(
        deliveryId,
        {
          status: "IN_TRANSIT",
        }
      );

      startGPSTracking(deliveryId);
    };

  /*
   * Mark delivered.
   */
  const handleDelivered = async () => {
    if (!activeDelivery) {
      return;
    }

    const watchId =
      (window as any).swiftDropGPSWatchId;

    if (watchId !== undefined) {
      navigator.geolocation.clearWatch(watchId);
      (window as any).swiftDropGPSWatchId = undefined;
    }

    setGpsTracking(false);

    await updateDelivery(
      activeDelivery.deliveryId,
      {
        status: "DELIVERED",
      }
    );
  };

  /*
   * Sign out.
   */
  const handleSignOut = async () => {
    try {
      await signOut();

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Sign-out error:",
        error
      );
    }
  };

  /*
   * Authentication loading.
   */
  if (!authorized) {
    return (
      <div
        style={
          styles.loadingPage
        }
      >
        <p>
          Verifying driver account...
        </p>
      </div>
    );
  }

  /*
   * Delivery loading.
   */
  if (loading) {
    return (
      <div
        style={
          styles.loadingPage
        }
      >
        <p>
          Loading driver dashboard...
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* =========================
          NAVIGATION
      ========================== */}

      <header
        style={styles.navbar}
      >
        <div
          style={styles.logo}
        >
          SwiftDrop

          <span
            style={
              styles.driverLabel
            }
          >
            DRIVER
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={
              styles.driverId
            }
          >
            {driverEmail || "Driver"}
          </span>

          <button
            type="button"
            onClick={
              handleSignOut
            }
            style={
              styles.signOutButton
            }
          >
            Sign Out
          </button>
        </div>
      </header>

      <main
        style={styles.container}
      >
        {/* =========================
            HEADER
        ========================== */}

        <section
          style={
            styles.headerSection
          }
        >
          <div>
            <p
              style={
                styles.eyebrow
              }
            >
              DRIVER DASHBOARD
            </p>

            <h1
              style={styles.title}
            >
              Driver Center
            </h1>

            <p
              style={
                styles.subtitle
              }
            >
              Manage available and
              active deliveries.
            </p>
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
        </section>

        {/* =========================
            GPS STATUS
        ========================== */}

        {gpsTracking && (
          <div
            style={{
              background: "#dcfce7",
              color: "#166534",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "14px",
              fontWeight: 600,
            }}
          >
            📍 Live GPS tracking is active
          </div>
        )}

        {gpsError && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: "10px",
              marginBottom: "14px",
              fontWeight: 600,
            }}
          >
            📍 {gpsError}
          </div>
        )}

        {/* =========================
            ERROR
        ========================== */}

        {error && (
          <div
            style={styles.error}
          >
            <strong>
              Error
            </strong>

            <p
              style={{
                margin: "8px 0 0",
                whiteSpace:
                  "pre-wrap",
                wordBreak:
                  "break-word",
              }}
            >
              {error}
            </p>
          </div>
        )}

        {/* =========================
            ACTIVE + AVAILABLE GRID
        ========================== */}

        <div style={styles.dashboardGrid}>

        {/* =========================
            ACTIVE DELIVERY
        ========================== */}

        <section
          style={
            styles.activeSection
          }
        >
          <div
            style={
              styles.activeHeader
            }
          >
            <div>
              <p
                style={
                  styles.eyebrow
                }
              >
                ACTIVE
              </p>

              <h2
                style={
                  styles.activeTitle
                }
              >
                Active Delivery
              </h2>
            </div>

            {activeDelivery && (
              <span
                style={
                  styles.activeStatus
                }
              >
                {formatStatus(
                  activeDelivery.status
                )}
              </span>
            )}
          </div>

          {!activeDelivery ? (
            <div
              style={
                styles.noActiveCard
              }
            >
              <div
                style={
                  styles.noActiveIcon
                }
              >
                🚚
              </div>

              <h3
                style={
                  styles.noActiveTitle
                }
              >
                No active delivery
              </h3>

              <p
                style={
                  styles.noActiveText
                }
              >
                Accept a delivery request
                to start managing it here.
              </p>
            </div>
          ) : (
            <>
              <div
                style={
                  styles.activeDeliveryId
                }
              >
                <span>
                  DELIVERY
                </span>

                <strong>
                  #
                  {activeDelivery.deliveryId.slice(
                    0,
                    8
                  )}
                </strong>
              </div>

              {/* Route */}

              <div
                style={
                  styles.routeContainer
                }
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
                        activeDelivery.pickupAddress
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
                        activeDelivery.destinationAddress
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Details */}

              <div
                style={styles.details}
              >
                <div
                  style={
                    styles.detailItem
                  }
                >
                  <span
                    style={
                      styles.detailLabel
                    }
                  >
                    ESTIMATED PRICE
                  </span>

                  <strong>
                    {activeDelivery.estimatedPrice !==
                      null &&
                    activeDelivery.estimatedPrice !==
                      undefined
                      ? `$${activeDelivery.estimatedPrice.toFixed(
                          2
                        )}`
                      : "—"}
                  </strong>
                </div>

                <div
                  style={
                    styles.detailItem
                  }
                >
                  <span
                    style={
                      styles.detailLabel
                    }
                  >
                    ESTIMATED TIME
                  </span>

                  <strong>
                    {
                      activeDelivery.estimatedTime ??
                      "—"
                    }
                  </strong>
                </div>
              </div>

              {/* Progress */}

              <div
                style={
                  styles.progressContainer
                }
              >
                <DeliveryStage
                  label="Accepted"
                  active={[
                    "ACCEPTED",
                    "PICKED_UP",
                    "IN_TRANSIT",
                    "DELIVERED",
                  ].includes(
                    activeDelivery.status
                  )}
                />

                <DeliveryStage
                  label="Picked Up"
                  active={[
                    "PICKED_UP",
                    "IN_TRANSIT",
                    "DELIVERED",
                  ].includes(
                    activeDelivery.status
                  )}
                />

                <DeliveryStage
                  label="In Transit"
                  active={[
                    "IN_TRANSIT",
                    "DELIVERED",
                  ].includes(
                    activeDelivery.status
                  )}
                />

                <DeliveryStage
                  label="Delivered"
                  active={
                    activeDelivery.status ===
                    "DELIVERED"
                  }
                />
              </div>

              {/* Actions */}

              <div
                style={
                  styles.actionContainer
                }
              >
                {activeDelivery.status ===
                  "ACCEPTED" && (
                  <button
                    type="button"
                    onClick={
                      handlePickedUp
                    }
                    disabled={
                      updatingDelivery ===
                      activeDelivery.deliveryId
                    }
                    style={
                      styles.primaryAction
                    }
                  >
                    {updatingDelivery ===
                    activeDelivery.deliveryId
                      ? "Updating..."
                      : "Mark Picked Up"}
                  </button>
                )}

                {activeDelivery.status ===
                  "PICKED_UP" && (
                  <button
                    type="button"
                    onClick={
                      handleStartDelivery
                    }
                    disabled={
                      updatingDelivery ===
                      activeDelivery.deliveryId
                    }
                    style={
                      styles.primaryAction
                    }
                  >
                    {updatingDelivery ===
                    activeDelivery.deliveryId
                      ? "Updating..."
                      : "Start Delivery"}
                  </button>
                )}

                {activeDelivery.status ===
                  "IN_TRANSIT" && (
                  <button
                    type="button"
                    onClick={
                      handleDelivered
                    }
                    disabled={
                      updatingDelivery ===
                      activeDelivery.deliveryId
                    }
                    style={
                      styles.completeAction
                    }
                  >
                    {updatingDelivery ===
                    activeDelivery.deliveryId
                      ? "Updating..."
                      : "Mark Delivered"}
                  </button>
                )}
              </div>
            </>
          )}
        </section>


        {/* =========================
            AVAILABLE DELIVERIES
        ========================== */}

        <section
          style={
            styles.availableSection
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <p
                style={
                  styles.eyebrow
                }
              >
                AVAILABLE
              </p>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Delivery Requests
              </h2>
            </div>

            <span
              style={
                styles.countBadge
              }
            >
              {deliveries.length}
            </span>
          </div>

          {deliveries.length === 0 ? (
            <div
              style={
                styles.emptyCard
              }
            >
              <div
                style={
                  styles.emptyIcon
                }
              >
                🚚
              </div>

              <h3
                style={
                  styles.emptyTitle
                }
              >
                No deliveries available
              </h3>

              <p
                style={
                  styles.emptyText
                }
              >
                New delivery requests will
                appear here.
              </p>
            </div>
          ) : (
            <div
              style={
                styles.deliveryList
              }
            >
              {deliveries.map(
                (delivery) => (
                  <article
                    key={
                      delivery.deliveryId
                    }
                    style={
                      styles.deliveryCard
                    }
                  >
                    <div
                      style={
                        styles.cardHeader
                      }
                    >
                      <div>
                        <p
                          style={
                            styles.deliveryLabel
                          }
                        >
                          DELIVERY REQUEST
                        </p>

                        <h3
                          style={
                            styles.deliveryId
                          }
                        >
                          #
                          {delivery.deliveryId.slice(
                            0,
                            8
                          )}
                        </h3>
                      </div>

                      <span
                        style={
                          styles.status
                        }
                      >
                        REQUESTED
                      </span>
                    </div>

                    {/* Pickup */}

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

                    {/* Destination */}

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

                    {/* Details */}

                    <div
                      style={
                        styles.details
                      }
                    >
                      <div
                        style={
                          styles.detailItem
                        }
                      >
                        <span
                          style={
                            styles.detailLabel
                          }
                        >
                          ESTIMATED PRICE
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

                      <div
                        style={
                          styles.detailItem
                        }
                      >
                        <span
                          style={
                            styles.detailLabel
                          }
                        >
                          ESTIMATED TIME
                        </span>

                        <strong>
                          {
                            delivery.estimatedTime ??
                            "—"
                          }
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleAcceptDelivery(
                          delivery.deliveryId
                        )
                      }
                      disabled={
                        updatingDelivery ===
                        delivery.deliveryId
                      }
                      style={
                        styles.acceptButton
                      }
                    >
                      {updatingDelivery ===
                      delivery.deliveryId
                        ? "Accepting..."
                        : "Accept Delivery"}
                    </button>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        </div>

        {/* =========================
            COMPLETED DELIVERIES
        ========================== */}

        <section
          style={
            styles.completedSection
          }
        >
          <div
            style={
              styles.sectionHeader
            }
          >
            <div>
              <p
                style={
                  styles.eyebrow
                }
              >
                HISTORY
              </p>

              <h2
                style={
                  styles.sectionTitle
                }
              >
                Completed Deliveries
              </h2>
            </div>

            <span
              style={
                styles.completedCountBadge
              }
            >
              {completedDeliveries.length}
            </span>
          </div>

          {completedDeliveries.length ===
          0 ? (
            <div
              style={
                styles.completedEmpty
              }
            >
              <p>
                Completed deliveries will
                appear here.
              </p>
            </div>
          ) : (
            <div
              style={
                styles.completedList
              }
            >
              {completedDeliveries.map(
                (delivery) => (
                  <article
                    key={
                      delivery.deliveryId
                    }
                    style={
                      styles.completedCard
                    }
                  >
                    <div
                      style={
                        styles.completedTop
                      }
                    >
                      <div>
                        <span
                          style={
                            styles.deliveryLabel
                          }
                        >
                          COMPLETED DELIVERY
                        </span>

                        <h3
                          style={
                            styles.completedId
                          }
                        >
                          #
                          {delivery.deliveryId.slice(
                            0,
                            8
                          )}
                        </h3>
                      </div>

                      <span
                        style={
                          styles.deliveredBadge
                        }
                      >
                        ✓ DELIVERED
                      </span>
                    </div>

                    <div
                      style={
                        styles.completedRoute
                      }
                    >
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
                            styles.completedAddress
                          }
                        >
                          {
                            delivery.pickupAddress
                          }
                        </p>
                      </div>

                      <div
                        style={
                          styles.arrow
                        }
                      >
                        →
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
                            styles.completedAddress
                          }
                        >
                          {
                            delivery.destinationAddress
                          }
                        </p>
                      </div>
                    </div>

                    <div
                      style={
                        styles.completedDetails
                      }
                    >
                      <span>
                        {delivery.estimatedPrice !==
                          null &&
                        delivery.estimatedPrice !==
                          undefined
                          ? `$${delivery.estimatedPrice.toFixed(
                              2
                            )}`
                          : "Price unavailable"}
                      </span>

                      <span>
                        {
                          delivery.estimatedTime ??
                          "Time unavailable"
                        }
                      </span>

                      <span>
                        {new Date(
                          delivery.updatedAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

/*
 * Delivery progress stage.
 */
function DeliveryStage({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div
      style={{
        ...styles.stage,
        opacity: active ? 1 : 0.35,
      }}
    >
      <div
        style={{
          ...styles.stageCircle,
          background: active
            ? "#2563eb"
            : "#d1d5db",
        }}
      >
        {active ? "✓" : ""}
      </div>

      <span
        style={
          styles.stageLabel
        }
      >
        {label}
      </span>
    </div>
  );
}

/*
 * Format delivery status.
 */
function formatStatus(
  status: string
) {
  return status.replace(
    /_/g,
    " "
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f7fb",
    color: "#64748b",
    fontSize: "14px",
  },

  navbar: {
    minHeight: "58px",
    height: "58px",
    padding: "0 24px",
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
  },

  logo: {
    fontSize: "18px",
    fontWeight: 800,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  driverLabel: {
    fontSize: "11px",
    fontWeight: 700,
    color: "#2563eb",
    background: "#dbeafe",
    padding: "5px 8px",
    borderRadius: "6px",
    letterSpacing: "0.5px",
  },

  driverId: {
    marginRight: "16px",
    color: "#64748b",
    fontSize: "12px",
  },

  signOutButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontWeight: 600,
    cursor: "pointer",
    fontSize: "14px",
  },

  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "10px 24px 30px",
  },

  headerSection: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-end",
    marginBottom: "10px",
    gap: "12px",
  },

  eyebrow: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    color: "#2563eb",
    letterSpacing: "1px",
  },

  title: {
    margin: "2px 0 2px",
    fontSize: "28px",
    color: "#111827",
  },

  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "14px",
  },

  refreshButton: {
    border:
      "1px solid #d1d5db",
    background: "#ffffff",
    color: "#374151",
    padding: "8px 16px",
    borderRadius: "8px",
    fontWeight: 600,
    cursor: "pointer",
  },

  error: {
    background: "#fee2e2",
    color: "#991b1b",
    padding: "18px 20px",
    borderRadius: "10px",
    marginBottom: "14px",
    fontWeight: 600,
  },

  dashboardGrid: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.35fr) minmax(0, 1fr)",
    gap: "18px",
    alignItems: "start",
    marginBottom: "24px",
  },

  activeSection: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "16px 22px",
    marginBottom: "0",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
    border:
      "1px solid #dbeafe",
  },

  activeHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "16px",
  },

  activeTitle: {
    margin: "4px 0 0",
    fontSize: "23px",
    color: "#111827",
  },

  activeStatus: {
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
  },

  activeDeliveryId: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    marginBottom: "9px",
  },

  noActiveCard: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "24px 20px",
    textAlign: "center",
    border:
      "1px solid #e5e7eb",
  },

  noActiveIcon: {
    fontSize: "30px",
    marginBottom: "8px",
  },

  noActiveTitle: {
    margin: "0 0 8px",
    color: "#111827",
    fontSize: "20px",
  },

  noActiveText: {
    margin: 0,
    color: "#64748b",
  },

  progressContainer: {
    display: "grid",
    gridTemplateColumns:
      "repeat(4, 1fr)",
    gap: "8px",
    padding: "10px 0",
    borderTop:
      "1px solid #e5e7eb",
    borderBottom:
      "1px solid #e5e7eb",
    marginBottom: "14px",
  },

  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    textAlign: "center",
  },

  stageCircle: {
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "14px",
  },

  stageLabel: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#374151",
  },

  actionContainer: {
    display: "flex",
    gap: "12px",
  },

  primaryAction: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "10px 15px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  completeAction: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "11px 15px",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  availableSection: {
    marginBottom: "0",
  },

  sectionHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "14px",
  },

  sectionTitle: {
    margin: "6px 0 0",
    fontSize: "26px",
    color: "#111827",
  },

  countBadge: {
    background: "#e5e7eb",
    color: "#374151",
    minWidth: "30px",
    height: "30px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
  },

  emptyCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "55px 30px",
    textAlign: "center",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
  },

  emptyIcon: {
    fontSize: "42px",
    marginBottom: "15px",
  },

  emptyTitle: {
    margin: "0 0 8px",
    color: "#111827",
  },

  emptyText: {
    margin: 0,
    color: "#64748b",
  },

  deliveryList: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },

  deliveryCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "26px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
  },

  cardHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "22px",
  },

  deliveryLabel: {
    display: "block",
    margin: 0,
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "1px",
  },

  deliveryId: {
    margin: "5px 0 0",
    fontSize: "22px",
    color: "#111827",
  },

  status: {
    background: "#fef3c7",
    color: "#92400e",
    padding: "6px 11px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
  },

  routeContainer: {
    marginBottom: "12px",
  },

  routePoint: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
  },

  pickupDot: {
    color: "#2563eb",
    fontSize: "16px",
    lineHeight: "16px",
  },

  destinationDot: {
    color: "#111827",
    fontSize: "20px",
    lineHeight: "20px",
  },

  routeLabel: {
    display: "block",
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.7px",
    marginBottom: "2px",
  },

  address: {
    margin: 0,
    color: "#111827",
    fontSize: "14px",
    lineHeight: "1.35",
  },

  routeLine: {
    width: "1px",
    height: "16px",
    background: "#d1d5db",
    marginLeft: "6px",
    marginTop: "1px",
    marginBottom: "1px",
  },

  details: {
    display: "flex",
    gap: "40px",
    borderTop:
      "1px solid #e5e7eb",
    paddingTop: "12px",
    marginTop: "12px",
    marginBottom: "12px",
  },

  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  detailLabel: {
    fontSize: "10px",
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.7px",
  },

  acceptButton: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "15px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  completedSection: {
    marginBottom: "50px",
  },

  completedCountBadge: {
    background: "#dcfce7",
    color: "#166534",
    minWidth: "30px",
    height: "30px",
    borderRadius: "15px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: 700,
  },

  completedEmpty: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "25px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
    color: "#64748b",
  },

  completedList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },

  completedCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    boxShadow:
      "0 4px 14px rgba(0,0,0,0.06)",
    border:
      "1px solid #dcfce7",
  },

  completedTop: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    marginBottom: "20px",
  },

  completedId: {
    margin: "5px 0 0",
    fontSize: "20px",
    color: "#111827",
  },

  deliveredBadge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "7px 12px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
  },

  completedRoute: {
    display: "grid",
    gridTemplateColumns:
      "1fr auto 1fr",
    gap: "20px",
    alignItems: "center",
    paddingBottom: "18px",
    borderBottom:
      "1px solid #e5e7eb",
  },

  completedAddress: {
    margin: 0,
    color: "#111827",
    fontSize: "14px",
    lineHeight: "1.5",
  },

  arrow: {
    color: "#94a3b8",
    fontSize: "20px",
    fontWeight: 700,
  },

  completedDetails: {
    display: "flex",
    gap: "25px",
    paddingTop: "16px",
    color: "#64748b",
    fontSize: "13px",
  },
};

export default DriverDashboard;