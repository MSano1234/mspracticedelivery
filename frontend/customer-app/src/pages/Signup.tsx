import { useState } from "react";

import {
  signUp,
} from "aws-amplify/auth";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

function Signup() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  /*
   * Get selected role from URL.
   *
   * /signup?role=orderer
   * /signup?role=driver
   */
  const urlRole =
    searchParams.get("role");

  const role =
    urlRole === "driver"
      ? "driver"
      : "orderer";

  const isDriver =
    role === "driver";

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    /*
     * Validate fields.
     */
    if (
      !email ||
      !password ||
      !confirmPassword
    ) {
      setError(
        "Please complete all fields."
      );

      return;
    }

    /*
     * Validate password confirmation.
     */
    if (
      password !==
      confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );

      return;
    }

    /*
     * Basic password validation.
     */
    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * Create the Cognito account.
       *
       * IMPORTANT:
       *
       * We use "custom:roles" instead of
       * "custom:role".
       *
       * This allows the same account to have:
       *
       * orderer
       * driver
       *
       * Example:
       *
       * custom:roles = "orderer"
       *
       * Later Login can change it to:
       *
       * custom:roles = "orderer,driver"
       */
      const result =
        await signUp({
          username: email,
          password,

          options: {
            userAttributes: {
              email,

              "custom:roles":
                role,
            },
          },
        });

      console.log(
        "Sign-up result:",
        result
      );

      /*
       * Cognito requires email
       * confirmation.
       */
      if (
        result.nextStep
          .signUpStep ===
        "CONFIRM_SIGN_UP"
      ) {
        navigate(
          "/confirm-signup",
          {
            state: {
              email,
              role,
            },
          }
        );

        return;
      }

      /*
       * Account created without
       * additional confirmation.
       */
      setMessage(
        `Your ${
          isDriver
            ? "driver"
            : "orderer"
        } account was created successfully.`
      );

    } catch (err: any) {

      console.error(
        "Sign-up error:",
        err
      );

      /*
       * Email already exists.
       *
       * We DON'T create another account.
       *
       * The user should sign in with
       * the existing account and select
       * the desired role.
       */
      if (
        err?.name ===
        "UsernameExistsException"
      ) {
        setError(
          `An account already exists with this email. Sign in as ${
            isDriver
              ? "Driver"
              : "Orderer"
          } to use this account for that role.`
        );

        return;
      }

      /*
       * Invalid password.
       */
      if (
        err?.name ===
        "InvalidPasswordException"
      ) {
        setError(
          "Password does not meet the required security requirements."
        );

        return;
      }

      /*
       * Cognito configuration problem.
       */
      if (
        err?.name ===
        "InvalidParameterException"
      ) {
        setError(
          "There is a configuration issue with the account roles. Please verify the Cognito custom:roles attribute."
        );

        return;
      }

      /*
       * Generic error.
       */
      setError(
        "Unable to create your account. Please check your information and try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* =========================
          LEFT SIDE
      ========================== */}

      <section className="login-visual">

        <div className="visual-content">

          <div className="brand-mark">
            SD
          </div>

          <h2>
            {isDriver ? (
              <>
                Start delivering
                <br />
                with SwiftDrop.
              </>
            ) : (
              <>
                Start your
                <br />
                delivery.
              </>
            )}
          </h2>

          <p>
            {isDriver
              ? "Create your driver account and start finding delivery opportunities."
              : "Create your account and request and track deliveries from one place."}
          </p>

          <div className="delivery-graphic">

            <div className="map-line"></div>

            <div className="location pickup">

              <span>
                📍
              </span>

              <small>
                Pickup
              </small>

            </div>

            <div className="delivery-car">
              🚚
            </div>

            <div className="location destination">

              <span>
                🏁
              </span>

              <small>
                Destination
              </small>

            </div>

          </div>

          <div className="feature-row">

            <div>

              <strong>
                {isDriver
                  ? "Find Deliveries"
                  : "Easy Delivery"}
              </strong>

              <span>
                {isDriver
                  ? "Discover available delivery requests."
                  : "Request a delivery in seconds."}
              </span>

            </div>

            <div>

              <strong>
                {isDriver
                  ? "Manage Deliveries"
                  : "Live Tracking"}
              </strong>

              <span>
                {isDriver
                  ? "Keep customers updated as you deliver."
                  : "Follow your delivery from pickup to destination."}
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* =========================
          SIGNUP FORM
      ========================== */}

      <section className="login-form-section">

        <div className="login-container">

          <div className="logo">
            SwiftDrop
          </div>

          {/* Role badge */}

          <div
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              gap:
                "7px",

              background:
                isDriver
                  ? "#f0fdf4"
                  : "#eff6ff",

              color:
                isDriver
                  ? "#166534"
                  : "#1d4ed8",

              padding:
                "6px 11px",

              borderRadius:
                "20px",

              fontSize:
                "12px",

              fontWeight:
                700,

              marginBottom:
                "16px",
            }}
          >

            <span>
              {isDriver
                ? "🚗"
                : "📦"}
            </span>

            {isDriver
              ? "Driver Account"
              : "Orderer Account"}

          </div>

          <h1>
            Create your account
          </h1>

          <p className="subtitle">

            {isDriver
              ? "Create your driver account to start delivering"
              : "Create your account to start requesting deliveries"}

          </p>

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

                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                background:
                  "#dcfce7",

                color:
                  "#166534",

                padding:
                  "12px 15px",

                borderRadius:
                  "8px",

                marginBottom:
                  "20px",

                fontSize:
                  "14px",

                lineHeight:
                  1.5,
              }}
            >
              {message}
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
          >

            {/* Email */}

            <div className="form-group">

              <label
                htmlFor="email"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(
                  event
                ) =>
                  setEmail(
                    event.target.value
                  )
                }
                autoComplete="email"
              />

            </div>

            {/* Password */}

            <div className="form-group">

              <label
                htmlFor="password"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
              />

            </div>

            {/* Confirm password */}

            <div className="form-group">

              <label
                htmlFor="confirmPassword"
              >
                Confirm password
              </label>

              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={
                  confirmPassword
                }
                onChange={(
                  event
                ) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                autoComplete="new-password"
              />

            </div>

            {/* Submit */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              {loading
                ? "Creating account..."
                : isDriver
                ? "Create Driver Account"
                : "Create Orderer Account"}

            </button>

          </form>

          {/* Login */}

          <p
            className="signup-text"
          >

            Already have an account?{" "}

            <Link
              to={`/login?role=${role}`}
            >
              Sign in
            </Link>

          </p>

          {/* Change role */}

          <div
            style={{
              marginTop:
                "20px",

              textAlign:
                "center",
            }}
          >

            <Link
              to="/"
              style={{
                color:
                  "#64748b",

                fontSize:
                  "13px",

                textDecoration:
                  "none",
              }}
            >
              ← Choose a different account type
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
}

export default Signup;