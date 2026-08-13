import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/api";

import {
  fetchUserAttributes,
  getCurrentUser,
} from "aws-amplify/auth";

import { useNavigate } from "react-router-dom";

const LIST_DELIVERIES = `
  query ListDeliveries {
    listDeliveries {
      id
      pickupAddress
      destinationAddress
      status
      createdAt
      driverId
      customerId
    }
  }
`;

type DeliveryStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED";

type Delivery = {
  id: string;
  pickupAddress?: string | null;
  destinationAddress?: string | null;
  status?: DeliveryStatus | string | null;
  createdAt?: string | null;
  driverId?: string | null;
  customerId?: string | null;
};

function DriverDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [authorized, setAuthorized] =
    useState(false);

  const [driverId, setDriverId] =
    useState("");

  const [deliveries, setDeliveries] =
    useState<Delivery[]>([]);

  const [error, setError] =
    useState("");

  /*
   * ============================================================
   * AUTHENTICATION / MULTI-ROLE CHECK
   * ============================================================
   *
   * SwiftDrop supports one account with multiple roles.
   *
   * Example:
   *
   * custom:roles = "orderer,driver"
   *
   * Existing accounts that still have:
   *
   * custom:role = "driver"
   *
   * are also supported.
   */

  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        const user =
          await getCurrentUser();

        console.log(
          "Authenticated user:",
          user
        );

        const attributes =
          await fetchUserAttributes();

        console.log(
          "Authenticated user attributes:",
          attributes
        );

        /*
         * New multi-role attribute.
         *
         * Example:
         *
         * "orderer,driver"
         */
        const rolesValue =
          attributes["custom:roles"];

        /*
         * Legacy single-role attribute.
         */
        const legacyRole =
          attributes["custom:role"];

        /*
         * Build the user's role list.
         */
        const roles = rolesValue
          ? rolesValue
              .split(",")
              .map((role) =>
                role
                  .trim()
                  .toLowerCase()
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
         * The user can access this dashboard
         * if "driver" is one of their roles.
         *
         * Valid examples:
         *
         * driver
         * orderer,driver
         * driver,orderer
         */

        if (
          !roles.includes("driver")
        ) {
          console.log(
            "User does not have the driver role."
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

        setDriverId(
          user.userId
        );

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
   * ============================================================
   * LOAD DELIVERIES
   * ============================================================
   *
   * Keep your existing delivery-loading logic here.
   *
   * The authentication check above is the important change:
   * it now uses custom:roles instead of relying exclusively
   * on custom:role.
   */

  useEffect(() => {
    if (!authorized || !driverId) {
      return;
    }

    let mounted = true;
    const client = generateClient();

    const loadDeliveries = async () => {
      try {
        const response: any = await client.graphql({
          query: LIST_DELIVERIES,
          authMode: "userPool",
        });

        if (!mounted) {
          return;
        }

        const allDeliveries: Delivery[] =
          response.data?.listDeliveries ?? [];

        /*
         * Only unassigned REQUESTED deliveries are shown
         * as available jobs for this driver.
         */
        const requestedDeliveries = allDeliveries.filter(
          (delivery) =>
            delivery.status === "REQUESTED" &&
            !delivery.driverId
        );

        setDeliveries(requestedDeliveries);
        setError("");
      } catch (loadError: any) {
        console.error(
          "Failed to load driver deliveries:",
          loadError
        );

        if (mounted) {
          setError(
            loadError?.errors?.[0]?.message ||
              loadError?.message ||
              "Unable to load deliveries."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    /*
     * Load immediately when the driver dashboard opens.
     */
    loadDeliveries();

    /*
     * Keep the dashboard synchronized while it remains open.
     *
     * New delivery requests appear automatically without
     * refreshing or leaving the Driver Dashboard.
     */
    const intervalId = window.setInterval(
      loadDeliveries,
      5000
    );

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [authorized, driverId]);

  /*
   * ============================================================
   * SIGN OUT
   * ============================================================
   */

  const handleSignOut =
    async () => {
      try {
        const {
          signOut,
        } = await import(
          "aws-amplify/auth"
        );

        await signOut();

        navigate("/", {
          replace: true,
        });

      } catch (signOutError) {
        console.error(
          "Sign out error:",
          signOutError
        );

        setError(
          "Unable to sign out. Please try again."
        );
      }
    };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          background:
            "#f8fafc",

          fontFamily:
            "Inter, system-ui, sans-serif",

          color:
            "#475569",
        }}
      >
        Checking your driver account...
      </div>
    );
  }

  /*
   * ============================================================
   * UNAUTHORIZED
   * ============================================================
   */

  if (!authorized) {
    return null;
  }

  /*
   * ============================================================
   * DASHBOARD
   * ============================================================
   */

  return (
    <div
      style={{
        minHeight:
          "100vh",

        background:
          "#f8fafc",

        fontFamily:
          "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >

      {/* ======================================================
          HEADER
      ======================================================= */}

      <header
        style={{
          background:
            "#ffffff",

          borderBottom:
            "1px solid #e2e8f0",

          padding:
            "18px 30px",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "space-between",

          gap:
            "20px",
        }}
      >

        <div>
          <div
            style={{
              fontSize:
                "24px",

              fontWeight:
                800,

              color:
                "#111827",
            }}
          >
            SwiftDrop
          </div>

          <div
            style={{
              marginTop:
                "3px",

              fontSize:
                "13px",

              color:
                "#64748b",
            }}
          >
            Driver Dashboard
          </div>
        </div>

        <div
          style={{
            display:
              "flex",

            alignItems:
              "center",

            gap:
              "12px",
          }}
        >

          <button
            type="button"
            onClick={() =>
              navigate("/home")
            }
            style={{
              border:
                "1px solid #dbeafe",

              background:
                "#eff6ff",

              color:
                "#2563eb",

              borderRadius:
                "8px",

              padding:
                "9px 14px",

              cursor:
                "pointer",

              fontWeight:
                600,
            }}
          >
            Orderer Mode
          </button>

          <button
            type="button"
            onClick={
              handleSignOut
            }
            style={{
              border:
                "1px solid #e2e8f0",

              background:
                "#ffffff",

              color:
                "#475569",

              borderRadius:
                "8px",

              padding:
                "9px 14px",

              cursor:
                "pointer",

              fontWeight:
                600,
            }}
          >
            Sign Out
          </button>

        </div>

      </header>

      {/* ======================================================
          MAIN
      ======================================================= */}

      <main
        style={{
          maxWidth:
            "1150px",

          margin:
            "0 auto",

          padding:
            "40px 24px",
        }}
      >

        {/* Page heading */}

        <div
          style={{
            marginBottom:
              "30px",
          }}
        >

          <div
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              gap:
                "7px",

              background:
                "#f0fdf4",

              color:
                "#166534",

              padding:
                "6px 11px",

              borderRadius:
                "20px",

              fontSize:
                "12px",

              fontWeight:
                700,

              marginBottom:
                "12px",
            }}
          >
            🚗 Driver
          </div>

          <h1
            style={{
              margin:
                "0 0 8px",

              fontSize:
                "34px",

              color:
                "#111827",
            }}
          >
            Driver Dashboard
          </h1>

          <p
            style={{
              margin:
                0,

              color:
                "#64748b",

              fontSize:
                "15px",
            }}
          >
            Manage your available and active
            deliveries from one place.
          </p>

        </div>

        {/* Error */}

        {error && (
          <div
            style={{
              background:
                "#fee2e2",

              color:
                "#b91c1c",

              padding:
                "12px 15px",

              borderRadius:
                "8px",

              marginBottom:
                "20px",

              fontSize:
                "14px",
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            STATS
        ===================================================== */}

        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",

            gap:
              "18px",

            marginBottom:
              "30px",
          }}
        >

          <div
            style={{
              background:
                "#ffffff",

              border:
                "1px solid #e2e8f0",

              borderRadius:
                "14px",

              padding:
                "22px",
            }}
          >
            <div
              style={{
                fontSize:
                  "13px",

                color:
                  "#64748b",

                marginBottom:
                  "8px",
              }}
            >
              Available Deliveries
            </div>

            <strong
              style={{
                fontSize:
                  "28px",

                color:
                  "#111827",
              }}
            >
              {deliveries.length}
            </strong>
          </div>

          <div
            style={{
              background:
                "#ffffff",

              border:
                "1px solid #e2e8f0",

              borderRadius:
                "14px",

              padding:
                "22px",
            }}
          >
            <div
              style={{
                fontSize:
                  "13px",

                color:
                  "#64748b",

                marginBottom:
                  "8px",
              }}
            >
              Active Deliveries
            </div>

            <strong
              style={{
                fontSize:
                  "28px",

                color:
                  "#111827",
              }}
            >
              {
                deliveries.filter(
                  (delivery) =>
                    delivery.status ===
                      "ACCEPTED" ||
                    delivery.status ===
                      "PICKED_UP" ||
                    delivery.status ===
                      "IN_TRANSIT"
                ).length
              }
            </strong>
          </div>

          <div
            style={{
              background:
                "#ffffff",

              border:
                "1px solid #e2e8f0",

              borderRadius:
                "14px",

              padding:
                "22px",
            }}
          >
            <div
              style={{
                fontSize:
                  "13px",

                color:
                  "#64748b",

                marginBottom:
                  "8px",
              }}
            >
              Driver ID
            </div>

            <strong
              style={{
                fontSize:
                  "14px",

                color:
                  "#111827",

                wordBreak:
                  "break-all",
              }}
            >
              {driverId}
            </strong>
          </div>

        </div>

        {/* ====================================================
            DELIVERY SECTION
        ===================================================== */}

        <section
          style={{
            background:
              "#ffffff",

            border:
              "1px solid #e2e8f0",

            borderRadius:
              "16px",

            overflow:
              "hidden",
          }}
        >

          <div
            style={{
              padding:
                "22px 24px",

              borderBottom:
                "1px solid #e2e8f0",

              display:
                "flex",

              alignItems:
                "center",

              justifyContent:
                "space-between",
            }}
          >

            <div>
              <h2
                style={{
                  margin:
                    "0 0 5px",

                  fontSize:
                    "20px",

                  color:
                    "#111827",
                }}
              >
                Available Deliveries
              </h2>

              <p
                style={{
                  margin:
                    0,

                  fontSize:
                    "13px",

                  color:
                    "#64748b",
                }}
              >
                Delivery requests available
                for drivers.
              </p>
            </div>

          </div>

          {/* Empty state */}

          {deliveries.length ===
            0 && (
            <div
              style={{
                padding:
                  "65px 24px",

                textAlign:
                  "center",
              }}
            >

              <div
                style={{
                  fontSize:
                    "42px",

                  marginBottom:
                    "14px",
                }}
              >
                🚚
              </div>

              <h3
                style={{
                  margin:
                    "0 0 8px",

                  color:
                    "#111827",

                  fontSize:
                    "18px",
                }}
              >
                No deliveries available
              </h3>

              <p
                style={{
                  margin:
                    0,

                  color:
                    "#64748b",

                  fontSize:
                    "14px",

                  maxWidth:
                    "450px",

                  marginInline:
                    "auto",

                  lineHeight:
                    1.6,
                }}
              >
                New delivery requests will
                appear here when they become
                available.
              </p>

            </div>
          )}

          {/* Delivery list */}

          {deliveries.length >
            0 && (
            <div>

              {deliveries.map(
                (
                  delivery
                ) => (
                  <div
                    key={
                      delivery.id
                    }
                    style={{
                      padding:
                        "22px 24px",

                      borderBottom:
                        "1px solid #f1f5f9",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",

                        justifyContent:
                          "space-between",

                        gap:
                          "20px",
                      }}
                    >

                      <div>

                        <div
                          style={{
                            fontWeight:
                              700,

                            color:
                              "#111827",

                            marginBottom:
                              "8px",
                          }}
                        >
                          Delivery
                        </div>

                        <div
                          style={{
                            color:
                              "#64748b",

                            fontSize:
                              "14px",

                            marginBottom:
                              "5px",
                          }}
                        >
                          Pickup:{" "}
                          {delivery.pickupAddress ||
                            "Not provided"}
                        </div>

                        <div
                          style={{
                            color:
                              "#64748b",

                            fontSize:
                              "14px",
                          }}
                        >
                          Destination:{" "}
                          {delivery.destinationAddress ||
                            "Not provided"}
                        </div>

                      </div>

                      <div
                        style={{
                          alignSelf:
                            "flex-start",

                          background:
                            "#eff6ff",

                          color:
                            "#2563eb",

                          borderRadius:
                            "20px",

                          padding:
                            "6px 11px",

                          fontSize:
                            "12px",

                          fontWeight:
                            700,

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {delivery.status ||
                          "PENDING"}
                      </div>

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default DriverDashboard;