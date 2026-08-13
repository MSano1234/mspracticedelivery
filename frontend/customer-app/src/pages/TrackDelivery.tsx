import { Link } from "react-router-dom";

function TrackDelivery() {
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

        <div className="track-header">
          <p className="eyebrow">
            LIVE DELIVERY
          </p>

          <h1>
            Track your delivery
          </h1>

          <p>
            Your delivery is being prepared.
          </p>
        </div>

        {/* Delivery Status */}

        <section className="active-delivery">

          <div className="section-header">

            <div>
              <p className="eyebrow">
                DELIVERY STATUS
              </p>

              <h2>
                Finding a driver
              </h2>
            </div>

            <span className="status-badge">
              Searching
            </span>

          </div>

          {/* Map */}

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
                Live driver tracking
              </h3>

              <p>
                Your driver's real-time location
                will appear here once a driver
                accepts the delivery.
              </p>

            </div>

          </div>

          {/* Delivery Details */}

          <div className="delivery-info">

            <div className="info-item">
              <span>
                STATUS
              </span>

              <strong>
                Finding Driver
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
                DISTANCE
              </span>

              <strong>
                —
              </strong>
            </div>

          </div>

        </section>

        {/* Delivery Timeline */}

        <section className="delivery-timeline">

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

          <div className="timeline-item active">
            <div className="timeline-dot">
              2
            </div>

            <div>
              <strong>
                Finding a driver
              </strong>

              <p>
                We're looking for an available driver.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot">
              3
            </div>

            <div>
              <strong>
                Driver assigned
              </strong>

              <p>
                A driver will be assigned to your delivery.
              </p>
            </div>
          </div>

          <div className="timeline-item">
            <div className="timeline-dot">
              4
            </div>

            <div>
              <strong>
                Delivered
              </strong>

              <p>
                Your package arrives at its destination.
              </p>
            </div>
          </div>

        </section>

      </main>
    </div>
  );
}

export default TrackDelivery;