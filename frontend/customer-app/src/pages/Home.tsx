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
         * SwiftDrop supports multiple roles on the
         * same Cognito account.
         *
         * Example:
         *
         * custom:roles = "orderer,driver"
         *
         * We also support the older:
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
         * DRIVER
         *
         * If the account contains the driver role,
         * use the Driver Dashboard.
         *
         * This works for:
         *
         * driver
         * orderer,driver
         * driver,orderer
         */
        if (roles.includes("driver")) {
          console.log(
            "Driver role detected. Redirecting to driver dashboard."
          );

          navigate(
            "/driver-dashboard",
            {
              replace: true,
            }
          );

          return;
        }

        /*
         * ORDERER
         */
        if (
          roles.includes("orderer") ||
          roles.length === 0
        ) {
          if (!mounted) {
            return;
          }

          /*
           * Display a friendly account value
           * instead of the Cognito UUID.
           */
          setUserEmail(
            attributes.email ||
            [
              attributes.given_name,
              attributes.family_name,
            ]
              .filter(Boolean)
              .join(" ") ||
            "Account"
          );

          setCheckingAuth(false);

          return;
        }

        /*
         * Unknown role.
         */
        console.error(
          "Unknown SwiftDrop user roles:",
          roles
        );

        setCheckingAuth(false);

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

      <main className="home-content">

        {/* =========================
            WELCOME SECTION
        ========================== */}

        <section className="welcome-section">

          <p className="eyebrow">
            CUSTOMER DASHBOARD
          </p>

          <h1>
            Deliver anything, anywhere.
          </h1>

          <p>
            Request a delivery and track your
            driver in real time.
          </p>

          <Link
            to="/create-delivery"
            className="primary-button"
          >
            Request a Delivery
          </Link>

        </section>

        {/* =========================
            ACTIVE DELIVERY
        ========================== */}

        <section className="active-delivery">

          {activeDelivery ? (
            <>
              {/* Active Delivery Header */}

              <div className="section-header">

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

              <div className="map-placeholder">

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

              <div className="delivery-info">

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