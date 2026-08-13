import { useState } from "react";

import {
  fetchUserAttributes,
  signIn,
  signOut,
  updateUserAttributes,
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
   * Selected account type from the URL.
   *
   * /login?role=orderer
   * /login?role=driver
   */
  const urlRole =
    searchParams.get("role");

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
   * Get the user's existing roles.
   *
   * New system:
   *
   * custom:roles
   *
   * Example:
   *
   * orderer
   *
   * or:
   *
   * orderer,driver
   *
   * We also support the old:
   *
   * custom:role
   *
   * so existing accounts are not broken.
   */
  const getExistingRoles = (
    attributes: Record<
      string,
      string | undefined
    >
  ): string[] => {
    const rolesValue =
      attributes["custom:roles"];

    if (rolesValue) {
      return rolesValue
        .split(",")
        .map((role) =>
          role.trim().toLowerCase()
        )
        .filter(Boolean);
    }

    /*
     * Migrate old single-role accounts.
     */
    const oldRole =
      attributes["custom:role"];

    if (oldRole) {
      return [
        oldRole
          .trim()
          .toLowerCase(),
      ];
    }

    return [];
  };

  /*
   * Add the selected role without
   * removing any existing role.
   *
   * Example:
   *
   * orderer
   *
   * becomes:
   *
   * orderer,driver
   */
  const addSelectedRole =
    async () => {
      const attributes =
        await fetchUserAttributes();

      console.log(
        "Current Cognito attributes:",
        attributes
      );

      const existingRoles =
        getExistingRoles(
          attributes
        );

      console.log(
        "Existing roles:",
        existingRoles
      );

      /*
       * Add the selected role if it
       * doesn't already exist.
       */
      if (
        !existingRoles.includes(
          selectedRole
        )
      ) {
        existingRoles.push(
          selectedRole
        );
      }

      const updatedRoles =
        existingRoles.join(",");

      console.log(
        "SwiftDrop roles:",
        updatedRoles
      );

      /*
       * Save the multi-role attribute.
       */
      if (
        attributes["custom:roles"] !==
        updatedRoles
      ) {
        await updateUserAttributes({
          userAttributes: {
            "custom:roles":
              updatedRoles,
          },
        });

        console.log(
          "Updated custom:roles:",
          updatedRoles
        );
      }

      return updatedRoles;
    };

  /*
   * Navigate according to the role
   * selected on the login page.
   *
   * IMPORTANT:
   *
   * We do NOT use custom:role here.
   *
   * The user intentionally selected
   * Orderer or Driver.
   */
  const navigateBySelectedRole =
    () => {
      console.log(
        "Selected SwiftDrop role:",
        selectedRole
      );

      if (
        selectedRole === "driver"
      ) {
        navigate(
          "/driver-dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      navigate(
        "/home",
        {
          replace: true,
        }
      );
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

      console.log(
        "Selected login role:",
        selectedRole
      );

      console.log(
        "Attempting login:",
        email
      );

      /*
       * Try to sign in normally.
       */
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
       * Successful authentication.
       */
      if (result.isSignedIn) {
        /*
         * Add the selected role to the
         * existing account.
         */
        await addSelectedRole();

        /*
         * IMPORTANT:
         *
         * Navigation is based on what the
         * user selected on the login page.
         */
        navigateBySelectedRole();

        return;
      }

      /*
       * Additional Cognito verification.
       */
      if (
        result.nextStep?.signInStep
      ) {
        console.log(
          "Additional sign-in step:",
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
       * If a Cognito session is already
       * active, sign it out and retry
       * using the credentials entered
       * on this page.
       */
      if (
        error?.name ===
        "UserAlreadyAuthenticatedException"
      ) {
        try {
          console.log(
            "Existing session detected. Signing out before retrying."
          );

          await signOut();

          /*
           * Now authenticate with the
           * email/password entered here.
           */
          const retryResult =
            await signIn({
              username: email,
              password,
            });

          console.log(
            "Retry sign-in result:",
            retryResult
          );

          if (
            retryResult.isSignedIn
          ) {
            await addSelectedRole();

            navigateBySelectedRole();

            return;
          }

          setError(
            "Additional verification is required before you can continue."
          );

        } catch (
          retryError: any
        ) {
          console.error(
            "Retry sign-in error:",
            retryError
          );

          setError(
            "Unable to sign in. Please check your email and password."
          );
        }

        return;
      }

      /*
       * Incorrect password/email.
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
       * Account doesn't exist.
       */
      if (
        error?.name ===
        "UserNotFoundException"
      ) {
        setError(
          "No SwiftDrop account was found with this email."
        );

        return;
      }

      /*
       * Email hasn't been confirmed.
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
       * Custom attribute problem.
       */
      if (
        error?.name ===
          "InvalidParameterException" &&
        String(
          error?.message
        )
          .toLowerCase()
          .includes("roles")
      ) {
        setError(
          "SwiftDrop could not update your account roles. Please verify the custom:roles attribute in Cognito."
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
                  : "Easy Delivery"}
              </strong>

              <span>
                {isDriver
                  ? "Update delivery status as you go."
                  : "Request deliveries in seconds."}
              </span>
            </div>

          </div>

        </div>

      </section>

      {/* =========================
          LOGIN FORM
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

                lineHeight:
                  1.5,
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
                    event.target.value
                  )
                }
                autoComplete="current-password"
              />

            </div>

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

          <p className="signup-text">

            Don't have an account?{" "}

            <Link
              to={`/signup?role=${selectedRole}`}
            >
              Create one
            </Link>

          </p>

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