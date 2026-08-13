import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  const handleOrderer = () => {
    navigate("/login?role=orderer");
  };

  const handleDriver = () => {
    navigate("/login?role=driver");
  };

  return (
    <div style={styles.page}>

      {/* Background decoration */}

      <div style={styles.backgroundCircleOne} />
      <div style={styles.backgroundCircleTwo} />

      {/* Main container */}

      <main style={styles.container}>

        {/* =========================
            BRAND
        ========================== */}

        <div style={styles.logoArea}>

          <div style={styles.logoIcon}>
            🚚
          </div>

          <h1 style={styles.logo}>
            SwiftDrop
          </h1>

          <p style={styles.tagline}>
            Fast, simple, reliable delivery.
          </p>

        </div>

        {/* =========================
            WELCOME
        ========================== */}

        <div style={styles.welcomeArea}>

          <p style={styles.eyebrow}>
            DELIVERY PLATFORM
          </p>

          <h2 style={styles.title}>
            Deliver with SwiftDrop.
          </h2>

          <p style={styles.description}>
            Whether you're sending something or
            delivering it, SwiftDrop brings
            everything together in one platform.
          </p>

        </div>

        {/* =========================
            ROLE SELECTION
        ========================== */}

        <div style={styles.roleSection}>

          <p style={styles.chooseText}>
            How would you like to use SwiftDrop?
          </p>

          <div style={styles.cards}>

            {/* =========================
                ORDERER
            ========================== */}

            <button
              type="button"
              onClick={handleOrderer}
              style={styles.roleCard}
            >

              <div
                style={{
                  ...styles.cardIcon,
                  background: "#eff6ff",
                }}
              >
                📦
              </div>

              <div style={styles.cardContent}>

                <div style={styles.cardTopRow}>

                  <div>
                    <p style={styles.cardEyebrow}>
                      FOR CUSTOMERS
                    </p>

                    <h3 style={styles.cardTitle}>
                      I'm an Orderer
                    </h3>
                  </div>

                  <span style={styles.arrow}>
                    →
                  </span>

                </div>

                <p style={styles.cardDescription}>
                  Request a delivery, find a driver,
                  and follow your delivery from
                  pickup to destination.
                </p>

                <span style={styles.cardAction}>
                  Continue as Orderer
                </span>

              </div>

            </button>

            {/* =========================
                DRIVER
            ========================== */}

            <button
              type="button"
              onClick={handleDriver}
              style={styles.roleCard}
            >

              <div
                style={{
                  ...styles.cardIcon,
                  background: "#f0fdf4",
                }}
              >
                🚗
              </div>

              <div style={styles.cardContent}>

                <div style={styles.cardTopRow}>

                  <div>
                    <p style={styles.cardEyebrow}>
                      FOR DRIVERS
                    </p>

                    <h3 style={styles.cardTitle}>
                      I'm a Driver
                    </h3>
                  </div>

                  <span style={styles.arrow}>
                    →
                  </span>

                </div>

                <p style={styles.cardDescription}>
                  Find available delivery requests,
                  accept deliveries, and manage your
                  active deliveries.
                </p>

                <span style={styles.cardAction}>
                  Continue as Driver
                </span>

              </div>

            </button>

          </div>

        </div>

        {/* =========================
            EXISTING ACCOUNT
        ========================== */}

        <div style={styles.existingAccount}>

          <span>
            Already have a SwiftDrop account?
          </span>

          <button
            type="button"
            onClick={() => navigate("/login")}
            style={styles.loginLink}
          >
            Sign in
          </button>

        </div>

        {/* =========================
            PLATFORM FEATURES
        ========================== */}

        <div style={styles.featureRow}>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>
              🔐
            </span>

            <div>
              <strong style={styles.featureTitle}>
                Secure
              </strong>

              <span style={styles.featureText}>
                AWS authentication
              </span>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>
              ⚡
            </span>

            <div>
              <strong style={styles.featureTitle}>
                Fast
              </strong>

              <span style={styles.featureText}>
                Simple delivery workflow
              </span>
            </div>
          </div>

          <div style={styles.feature}>
            <span style={styles.featureIcon}>
              📍
            </span>

            <div>
              <strong style={styles.featureTitle}>
                Connected
              </strong>

              <span style={styles.featureText}>
                Real-time delivery updates
              </span>
            </div>
          </div>

        </div>

        {/* =========================
            FOOTER
        ========================== */}

        <footer style={styles.footer}>

          <span>
            SwiftDrop
          </span>

          <span>
            •
          </span>

          <span>
            Built with AWS
          </span>

          <span>
            •
          </span>

          <span>
            Delivery management platform
          </span>

        </footer>

      </main>

    </div>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%)",
    position: "relative",
    overflow: "hidden",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  backgroundCircleOne: {
    position: "absolute",
    width: "420px",
    height: "420px",
    borderRadius: "50%",
    background:
      "rgba(37, 99, 235, 0.06)",
    top: "-180px",
    right: "-120px",
  },

  backgroundCircleTwo: {
    position: "absolute",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background:
      "rgba(59, 130, 246, 0.05)",
    bottom: "-160px",
    left: "-100px",
  },

  container: {
    position: "relative",
    zIndex: 1,
    maxWidth: "1050px",
    margin: "0 auto",
    padding:
      "55px 24px 35px",
  },

  logoArea: {
    textAlign: "center",
    marginBottom: "45px",
  },

  logoIcon: {
    width: "58px",
    height: "58px",
    margin: "0 auto 12px",
    borderRadius: "16px",
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "30px",
    boxShadow:
      "0 8px 25px rgba(37, 99, 235, 0.25)",
  },

  logo: {
    margin: 0,
    fontSize: "34px",
    fontWeight: 800,
    color: "#111827",
    letterSpacing: "-1px",
  },

  tagline: {
    margin:
      "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  welcomeArea: {
    textAlign: "center",
    marginBottom: "30px",
  },

  eyebrow: {
    margin: 0,
    color: "#2563eb",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "1.5px",
  },

  title: {
    margin:
      "10px 0 12px",
    color: "#111827",
    fontSize: "42px",
    lineHeight: 1.12,
    letterSpacing: "-1.5px",
  },

  description: {
    maxWidth: "620px",
    margin:
      "0 auto",
    color: "#64748b",
    fontSize: "16px",
    lineHeight: 1.6,
  },

  roleSection: {
    maxWidth: "900px",
    margin: "0 auto",
  },

  chooseText: {
    textAlign: "center",
    margin:
      "0 0 15px",
    color: "#475569",
    fontSize: "14px",
    fontWeight: 600,
  },

  cards: {
    display: "grid",
    gridTemplateColumns:
      "repeat(2, minmax(0, 1fr))",
    gap: "20px",
  },

  roleCard: {
    border:
      "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "25px",
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    boxShadow:
      "0 8px 30px rgba(15, 23, 42, 0.07)",
    transition:
      "transform 0.2s ease, box-shadow 0.2s ease",
    fontFamily: "inherit",
  },

  cardIcon: {
    width: "58px",
    height: "58px",
    minWidth: "58px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "29px",
  },

  cardContent: {
    flex: 1,
    minWidth: 0,
  },

  cardTopRow: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "flex-start",
    gap: "10px",
  },

  cardEyebrow: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 800,
    letterSpacing: "1px",
  },

  cardTitle: {
    margin:
      "4px 0 8px",
    color: "#111827",
    fontSize: "20px",
    fontWeight: 750,
  },

  cardDescription: {
    margin:
      "0 0 16px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  arrow: {
    color: "#2563eb",
    fontSize: "22px",
    fontWeight: 600,
  },

  cardAction: {
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 700,
  },

  existingAccount: {
    marginTop: "28px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "7px",
    color: "#64748b",
    fontSize: "13px",
  },

  loginLink: {
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },

  featureRow: {
    maxWidth: "760px",
    margin:
      "45px auto 0",
    display: "grid",
    gridTemplateColumns:
      "repeat(3, 1fr)",
    gap: "15px",
  },

  feature: {
    background:
      "rgba(255, 255, 255, 0.75)",
    border:
      "1px solid rgba(226, 232, 240, 0.8)",
    borderRadius: "12px",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  featureIcon: {
    fontSize: "18px",
  },

  featureTitle: {
    display: "block",
    color: "#334155",
    fontSize: "12px",
  },

  featureText: {
    display: "block",
    marginTop: "2px",
    color: "#94a3b8",
    fontSize: "10px",
  },

  footer: {
    marginTop: "30px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
    color: "#94a3b8",
    fontSize: "10px",
  },
};