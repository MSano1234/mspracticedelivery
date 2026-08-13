import { useState } from "react";
import {
  fetchUserAttributes,
  getCurrentUser,
  signIn,
} from "aws-amplify/auth";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  /*
   * Read the account type selected
   * on the Welcome page.
   *
   * /login?role=orderer
   * /login?role=driver
   */
  const urlRole =
    searchParams.get("role");

  /*
   * Default to orderer if no role
   * was provided.
   */
  const selectedRole =
    urlRole === "driver"
      ? "driver"
      : "orderer";

  const isDriver =
    selectedRole === "driver";

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /*
   * Navigate based on the ACTUAL
   * Cognito role.
   */
  const navigateByRole = (
    actualRole: string | undefined
  ) => {
    console.log(
      "Navigating based on Cognito role:",
      actualRole
    );

    if (actualRole === "driver") {
      navigate(
        "/driver-dashboard",
        {
          replace: true,
        }
      );

      return;
    }

    if (actualRole === "orderer") {
      navigate(
        "/home",
        {
          replace: true,
        }
      );

      return;
    }

    /*
     * If the account doesn't have
     * a valid role, don't guess.
     */
    setError(
      "Your SwiftDrop account does not have a valid account type. Please contact support."
    );
  };

  /*
   * Verify the currently authenticated
   * user's Cognito role.
   */
  const verifyExistingSession =
    async () => {
      try {
        const currentUser =
          await getCurrentUser();

        console.log(
          "Existing authenticated user:",
          currentUser
        );

        const attributes =
          await fetchUserAttributes();

        console.log(
          "Existing user attributes:",
          attributes
        );

        const actualRole =
          attributes["custom:role"];

        console.log(
          "Existing Cognito role:",
          actualRole
        );

        /*
         * Make sure the selected role
         * matches the actual account.
         */
        if (
          actualRole !==
          selectedRole
        ) {
          setError(
            `This email is registered as a ${
              actualRole === "driver"
                ? "Driver"
                : "Orderer"
            } account. Please choose the correct account type.`
          );

          return true;
        }

        navigateByRole(
          actualRole
        );

        return true;

      } catch {
        /*
         * No existing session.
         */
        return false;
      }
    };

  /*
   * Login.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!email || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);

      /*
       * First check whether the browser
       * already has an authenticated
       * Cognito session.
       */
      const alreadyAuthenticated =
        await verifyExistingSession();

      if (alreadyAuthenticated) {
        return;
      }

      /*
       * Sign in with Cognito.
       */
      console.log(
        "Signing in:",
        email
      );

      const result =
        await signIn({
          username: email,
          password,
        });

      console.log(
        "Cognito sign-in result:",
        result
      );

      /*
       * Successful sign-in.
       */
      if (result.isSignedIn) {
        /*
         * Get the actual Cognito
         * attributes after authentication.
         */
        const attributes =
          await fetchUserAttributes();

        console.log(
          "Authenticated user attributes:",
          attributes
        );

        const actualRole =
          attributes["custom:role"];

        console.log(
          "ACTUAL COGNITO ROLE:",
          actualRole
        );

        /*
         * Make sure the account type
         * selected on the login page
         * matches the user's actual role.
         */
        if (
          actualRole !==
          selectedRole
        ) {
          /*
           * Do not allow the user to
           * enter the wrong dashboard.
           */
          setError(
            `This account is registered as a ${
              actualRole === "driver"
                ? "Driver"
                : actualRole === "orderer"
                ? "Orderer"
                : "different"
            } account. Please choose the correct account type.`
          );

          return;
        }

        /*
         * Navigate according to the
         * actual Cognito role.
         */
        navigateByRole(
          actualRole
        );

        return;
      }

      /*
       * Additional Cognito steps.
       */
      if (
        result.nextStep?.signInStep
      ) {
        console.log(
          "Additional sign-in step required:",
          result.nextStep.signInStep
        );

        setError(
          `Additional verification is required: ${result.nextStep.signInStep}`
        );
      }

    } catch (error: any) {
      console.error(
        "Sign-in error:",
        error
      );

      /*
       * Already authenticated.
       */
      if (
        error?.name ===
        "UserAlreadyAuthenticatedException"
      ) {
        try {
          const attributes =
            await fetchUserAttributes();

          const actualRole =
            attributes["custom:role"];

          console.log(
            "Already authenticated role:",
            actualRole
          );

          if (
            actualRole !==
            selectedRole
          ) {
            setError(
              `This account is registered as a ${
                actualRole === "driver"
                  ? "Driver"
                  : "Orderer"
              } account. Please choose the correct account type.`
            );

            return;
          }

          navigateByRole(
            actualRole
          );

        } catch (
          roleError
        ) {
          console.error(
            "Unable to verify existing account role:",
            roleError
          );

          setError(
            "Unable to verify your SwiftDrop account."
          );
        }

        return;
      }

      /*
       * Incorrect credentials.
       */
      if (
        error?.name ===
        "NotAuthorizedException"
      ) {
        setError(
          "Incorrect email or password."
        );

        return;
      }

      /*
       * User does not exist.
       */
      if (
        error?.name ===
        "UserNotFoundException"
      ) {
        setError(
          `No SwiftDrop ${
            isDriver
              ? "driver"
              : "orderer"
          } account was found with this email.`
        );

        return;
      }

      /*
       * User has not confirmed
       * their email.
       */
      if (
        error?.name ===
        "UserNotConfirmedException"
      ) {
        setError(
          "Please verify your email before signing in."
        );

        return;
      }

      /*
       * Generic error.
       */
      setError(
        "Unable to sign in. Please try again."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* =========================
          LEFT VISUAL SECTION
      ========================== */}

      <section className="login-visual">

        <div className="visual-content">

          <div className="brand-mark">
            SD
          </div>

          <h2>
            {isDriver ? (
              <>
                Deliver more,
                <br />
                earn more.
              </>
            ) : (
              <>
                Delivery tracking,
                <br />
                made simple.
              </>
            )}
          </h2>

          <p>
            {isDriver
              ? "Find delivery requests, accept jobs, and manage your deliveries with SwiftDrop."
              : "Create delivery requests and follow your driver from pickup to destination."}
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
                  ? "Available Deliveries"
                  : "Live Tracking"}
              </strong>

              <span>
                {isDriver
                  ? "Find and accept delivery requests."
                  : "Follow your delivery in real time."}
              </span>
            </div>

            <div>
              <strong>
                {isDriver
                  ? "Manage Deliveries"
                  : "Fast Delivery"}
              </strong>

              <span>
                {isDriver
                  ? "Update delivery status as you go."
                  : "Simple delivery management."}
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================
          LOGIN SECTION
      ========================== */}

      <section className="login-form-section">

        <div className="login-container">

          <div className="logo">
            SwiftDrop
          </div>

          {/* Account type */}

          <div
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: "7px",
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
              fontSize: "12px",
              fontWeight: 700,
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
            Welcome back
          </h1>

          <p className="subtitle">
            {isDriver
              ? "Sign in to manage your deliveries"
              : "Sign in to manage and track your deliveries"}
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
                lineHeight: 1.5,
              }}
            >
              {error}
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
                    event.target
                      .value
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
                placeholder="Enter your password"
                value={password}
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target
                      .value
                  )
                }
                autoComplete="current-password"
              />

            </div>

            {/* Submit */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : isDriver
                ? "Sign In as Driver"
                : "Sign In as Orderer"}
            </button>

          </form>

          {/* Signup */}

          <p
            className="signup-text"
          >
            Don't have a{" "}
            {isDriver
              ? "driver"
              : "orderer"}{" "}
            account?{" "}

            <Link
              to={`/signup?role=${selectedRole}`}
            >
              Create one
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

export default Login;