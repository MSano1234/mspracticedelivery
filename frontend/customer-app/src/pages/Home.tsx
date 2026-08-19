import { Link, useNavigate } from "react-router-dom";
import {
  getCurrentUser,
  fetchUserAttributes,
  signOut,
} from "aws-amplify/auth";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import MyDeliveries from "./MyDeliveries";

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

function Home() {
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [userEmail, setUserEmail] =
    useState("");

  const [activeDelivery, setActiveDelivery] =
    useState<Delivery | null>(null);

  /*
   * Check authentication and user role.
   */
  useEffect(() => {
    let mounted = true;

    async function checkAuthentication() {
      try {
        /*
         * Get the currently authenticated Cognito user.
         */
        const user = await getCurrentUser();

        console.log(
          "Authenticated user:",
          user
        );

        /*
         * Get Cognito user attributes.
         */
        const attributes =
          await fetchUserAttributes();

        console.log(
          "Authenticated user attributes:",
          attributes
        );

        /*
         * A SwiftDrop account can have multiple roles,
         * for example:
         *
         * custom:roles = "orderer,driver"
         *
         * Login.tsx already decides whether the user
         * selected Driver or Orderer and sends them to
         * the appropriate dashboard.
         *
         * Home must NOT redirect based on the presence
         * of the driver role.
         */
        console.log(
          "SwiftDrop user roles:",
          attributes["custom:roles"]
        );

        if (!mounted) {
          return;
        }

        setUserEmail(
          attributes["email"] ||
          user.username
        );

        setCheckingAuth(false);

        return;

      } catch (error) {
        console.log(
          "User is not authenticated.",
          error
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
   * Sign out
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
   * Receive deliveries from MyDeliveries
   * and identify the current active delivery.
   */
  const handleDeliveriesLoaded =
    useCallback(
      (deliveries: Delivery[]) => {
        const activeStatuses = [
          "REQUESTED",
          "ACCEPTED",
          "PICKED_UP",
          "IN_TRANSIT",
        ];

        const active =
          deliveries.find(
            (delivery) =>
              activeStatuses.includes(
                delivery.status
              )
          );

        setActiveDelivery(
          active ?? null
        );
      },
      []
    );

  /*
   * Loading screen
   */
  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f7fb",
          color: "#64748b",
          fontSize: "16px",
        }}
      >
        Loading SwiftDrop...
      </div>
    );
  }

  return (
    <div className="home-page">

      {/* =========================
          NAVIGATION
      ========================== */}

      <header className="navbar">

        <div className="logo">
          SwiftDrop
        </div>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              marginRight: "20px",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            {userEmail}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
              fontSize: "14px",
            }}
          >
            Sign Out
          </button>
        </nav>

      </header>

      <main
        className="home-content"
        style={{
          paddingTop: "24px",
          paddingBottom: "32px",
        }}
      >

        {/* =========================
            ACTIVE + REQUEST
        ========================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "minmax(0, 1.35fr) minmax(320px, 0.75fr)",
            gap: "20px",
            alignItems: "stretch",
            marginBottom: "28px",
          }}
        >

        {/* =========================
            ACTIVE DELIVERY
        ========================== */}

        <section
          className="active-delivery"
          style={{
            margin: 0,
            minWidth: 0,
            padding: "24px",
          }}
        >

          {activeDelivery ? (
            <>
              {/* Active Delivery Header */}

              <div
                className="section-header"
                style={{ marginBottom: "14px" }}
              >

                <div>

                  <p className="eyebrow">
                    ACTIVE DELIVERY
                  </p>

                  <h2>
                    {getActiveDeliveryTitle(
                      activeDelivery.status
                    )}
                  </h2>

                </div>

                <span className="status-badge">
                  {formatStatus(
                    activeDelivery.status
                  )}
                </span>

              </div>

              {/* Delivery Route */}

              <div
                className="route-card"
                style={{
                  padding: "16px 20px",
                  marginBottom: "14px",
                }}
              >

                <div className="route-point">

                  <div className="route-icon pickup-icon">
                    ●
                  </div>

                  <div>

                    <span>
                      PICKUP
                    </span>

                    <strong>
                      {
                        activeDelivery.pickupAddress
                      }
                    </strong>

                  </div>

                </div>

                <div className="route-line"></div>

                <div className="route-point">

                  <div className="route-icon destination-icon">
                    ●
                  </div>

                  <div>

                    <span>
                      DESTINATION
                    </span>

                    <strong>
                      {
                        activeDelivery.destinationAddress
                      }
                    </strong>

                  </div>

                </div>

              </div>

              {/* Map Placeholder */}

              <div
                className="map-placeholder"
                style={{
                  height: "230px",
                  minHeight: "230px",
                  marginBottom: "14px",
                }}
              >

                <div className="map-road road-one"></div>

                <div className="map-road road-two"></div>

                <div className="map-road road-three"></div>

                <div className="map-marker pickup-marker">
                  📍
                </div>

                <div className="map-marker destination-marker">
                  🏁
                </div>

                <div className="map-car">
                  🚚
                </div>

                <div className="map-message">

                  <h3>
                    Your live delivery map
                  </h3>

                  <p>
                    {activeDelivery.driverId
                      ? "Your driver's location will appear here as live tracking becomes available."
                      : "Your driver has not been assigned yet."}
                  </p>

                </div>

              </div>

              {/* Delivery Information */}

              <div
                className="delivery-info"
                style={{
                  padding: "12px 0",
                  marginBottom: "14px",
                }}
              >

                <div className="info-item">

                  <span>
                    DRIVER
                  </span>

                  <strong>
                    {activeDelivery.driverId
                      ? activeDelivery.driverId
                      : "Not assigned"}
                  </strong>

                </div>

                <div className="info-item">

                  <span>
                    ETA
                  </span>

                  <strong>
                    {activeDelivery.estimatedTime ??
                      "—"}
                  </strong>

                </div>

                <div className="info-item">

                  <span>
                    PRICE
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

              </div>

              {/* Track Delivery */}

              <Link
                to={`/track-delivery/${activeDelivery.deliveryId}`}
                className="track-button"
                style={{
                  minHeight: "48px",
                  boxSizing: "border-box",
                }}
              >
                Track Delivery
              </Link>

            </>
          ) : (

            <>
              {/* No Active Delivery */}

              <div className="section-header">

                <div>

                  <p className="eyebrow">
                    ACTIVE DELIVERY
                  </p>

                  <h2>
                    No active delivery
                  </h2>

                </div>

                <span className="status-badge">
                  Ready
                </span>

              </div>

              {/* Empty Route */}

              <div className="route-card">

                <div className="route-point">

                  <div className="route-icon pickup-icon">
                    ●
                  </div>

                  <div>

                    <span>
                      PICKUP
                    </span>

                    <strong>
                      Your pickup location
                    </strong>

                  </div>

                </div>

                <div className="route-line"></div>

                <div className="route-point">

                  <div className="route-icon destination-icon">
                    ●
                  </div>

                  <div>

                    <span>
                      DESTINATION
                    </span>

                    <strong>
                      Delivery destination
                    </strong>

                  </div>

                </div>

              </div>

              {/* Empty Map */}

              <div className="map-placeholder">

                <div className="map-message">

                  <h3>
                    Your live delivery map
                  </h3>

                  <p>
                    Request a delivery to start
                    tracking.
                  </p>

                </div>

              </div>

              {/* Empty Delivery Information */}

              <div className="delivery-info">

                <div className="info-item">

                  <span>
                    DRIVER
                  </span>

                  <strong>
                    Not assigned
                  </strong>

                </div>

                <div className="info-item">

                  <span>
                    ETA
                  </span>

                  <strong>
                    —
                  </strong>

                </div>

                <div className="info-item">

                  <span>
                    PRICE
                  </span>

                  <strong>
                    —
                  </strong>

                </div>

              </div>

            </>
          )}

        </section>

        {/* =========================
            REQUEST NEW DELIVERY
        ========================== */}

        <section
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "24px",
            border: "1px solid #e5e7eb",
            boxShadow:
              "0 4px 14px rgba(0,0,0,0.06)",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignSelf: "start",
            height: "fit-content",
            boxSizing: "border-box",
          }}
        >
          <p
            className="eyebrow"
            style={{
              marginBottom: "10px",
            }}
          >
            NEW DELIVERY
          </p>

          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "28px",
              color: "#111827",
            }}
          >
            Request a Delivery
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#64748b",
              fontSize: "16px",
              lineHeight: 1.5,
            }}
          >
            Send a package anywhere and track your
            driver in real time.
          </p>

          <Link
            to="/create-delivery"
            className="primary-button"
            style={{
              display: "inline-flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              boxSizing: "border-box",
              textDecoration: "none",
            }}
          >
            Request a Delivery
          </Link>

          <div
            style={{
              marginTop: "18px",
              paddingTop: "18px",
              borderTop:
                "1px solid #e5e7eb",
              color: "#64748b",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            Need another delivery? You can
            create a new request whenever you are
            ready.
          </div>
        </section>

        </div>

        {/* =========================
            MY DELIVERIES
        ========================== */}

        <MyDeliveries
          onDeliveriesLoaded={
            handleDeliveriesLoaded
          }
        />

      </main>

    </div>
  );
}

/*
 * Format delivery status
 */
function formatStatus(
  status: string
) {
  return status.replace(
    /_/g,
    " "
  );
}

/*
 * Customer-facing title
 */
function getActiveDeliveryTitle(
  status: string
) {
  switch (status) {

    case "REQUESTED":
      return "Waiting for a driver";

    case "ACCEPTED":
      return "Driver accepted your delivery";

    case "PICKED_UP":
      return "Package picked up";

    case "IN_TRANSIT":
      return "Delivery is in transit";

    default:
      return "Active delivery";
  }
}

export default Home;