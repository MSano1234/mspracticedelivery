import { useState } from "react";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { Link, useLocation, useNavigate } from "react-router-dom";

function ConfirmSignup() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(
    location.state?.email || ""
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleConfirm(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!email || !code) {
      setError(
        "Please enter your email and verification code."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      console.log("Confirmation result:", result);

      setMessage(
        "Your email has been verified successfully!"
      );

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      console.error(error);

      setError(
        "The verification code is invalid or expired. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setMessage("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setResending(true);

      await resendSignUpCode({
        username: email,
      });

      setMessage(
        "A new verification code has been sent to your email."
      );
    } catch (error) {
      console.error(error);

      setError(
        "Unable to resend the verification code."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="login-page">

      {/* LEFT SIDE */}

      <section className="login-visual">

        <div className="visual-content">

          <div className="brand-mark">
            SD
          </div>

          <h2>
            Almost there.
          </h2>

          <p>
            Verify your email to activate your
            SwiftDrop customer account.
          </p>

          <div className="delivery-graphic">

            <div className="map-line"></div>

            <div className="location pickup">
              <span>📍</span>
              <small>Pickup</small>
            </div>

            <div className="delivery-car">
              🚚
            </div>

            <div className="location destination">
              <span>🏁</span>
              <small>Destination</small>
            </div>

          </div>

          <div className="feature-row">

            <div>
              <strong>
                Secure Account
              </strong>

              <span>
                Your account is protected by Amazon Cognito.
              </span>
            </div>

            <div>
              <strong>
                Real-Time Tracking
              </strong>

              <span>
                Track your driver once your delivery starts.
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* RIGHT SIDE */}

      <section className="login-form-section">

        <div className="login-container">

          <div className="logo">
            SwiftDrop
          </div>

          <h1>
            Verify your email
          </h1>

          <p className="subtitle">
            Enter the verification code we sent to your email.
          </p>

          {error && (
            <div
              style={{
                background: "#fee2e2",
                color: "#b91c1c",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                background: "#dcfce7",
                color: "#166534",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleConfirm}>

            <div className="form-group">

              <label htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
              />

            </div>

            <div className="form-group">

              <label htmlFor="code">
                Verification code
              </label>

              <input
                id="code"
                type="text"
                placeholder="Enter verification code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value)
                }
              />

            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Verifying..."
                : "Verify Email"}
            </button>

          </form>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            style={{
              width: "100%",
              marginTop: "15px",
              padding: "12px",
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {resending
              ? "Sending..."
              : "Resend verification code"}
          </button>

          <p className="signup-text">
            Already verified?{" "}
            <Link to="/">
              Sign in
            </Link>
          </p>

        </div>

      </section>

    </div>
  );
}

export default ConfirmSignup;