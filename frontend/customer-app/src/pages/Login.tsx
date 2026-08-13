import { useState } from "react";

import {
  fetchUserAttributes,
  getCurrentUser,
  signIn,
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
   * Read the role selected on the
   * Welcome page.
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
   * Convert the roles stored in Cognito
   * into a clean array.
   *
   * Example:
   *
   * "orderer,driver"
   *
   * becomes:
   *
   * ["orderer", "driver"]
   */
  const parseRoles = (
    rolesValue: string | undefined,
    oldRole?: string
  ): string[] => {
    if (rolesValue) {
      return rolesValue
        .split(",")
        .map((role) =>
          role.trim().toLowerCase()
        )
        .filter(Boolean);
    }

    /*
     * Backward compatibility for accounts
     * created before the new roles system.
     *
     * If the old custom:role exists,
     * migrate that role into the new system.
     */
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
   * Add the selected role to the user's
   * existing roles.
   *
   * This does NOT remove the existing role.
   */
  const ensureSelectedRole =
    async (
      attributes: Record<
        string,
        string | undefined
      >
    ): Promise<string[]> => {
      const existingRoles =
        parseRoles(
          attributes["custom:roles"],
          attributes["custom:role"]
        );

      if (
        existingRoles.includes(
          selectedRole
        )
      ) {
        return existingRoles;
      }

      const updatedRoles = [
        ...existingRoles,
        selectedRole,
      ];

      console.log(
        "Adding role to account:",
        selectedRole
      );

      console.log(
        "Updated roles:",
        updatedRoles
      );

      await updateUserAttributes({
        userAttributes: {
          "custom:roles":
            updatedRoles.join(","),
        },
      });

      return updatedRoles;
    };

  /*
   * Navigate based on the role
   * the user selected.
   *
   * We no longer navigate based on
   * one permanent Cognito role.
   */
  const navigateBySelectedRole =
    () => {
      console.log(
        "Navigating using selected role:",
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
   * Verify an already authenticated
   * session.
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

        /*
         * Automatically add the selected
         * role if necessary.
         */
        await ensureSelectedRole(
          attributes
        );

        /*
         * The user is authorized for
         * the selected mode.
         */
        navigateBySelectedRole();

        return true;
      } catch (error) {
        console.log(
          "No existing authenticated session."
        );

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
       * Authenticate with Cognito.
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
       * Successful authentication.
       */
      if (result.isSignedIn) {
        /*
         * Get the user's current attributes.
         */
        const attributes =
          await fetchUserAttributes();

        console.log(
          "Authenticated user attributes:",
          attributes
        );

        /*
         * Add the selected role if the
         * user doesn't already have it.
         */
        await ensureSelectedRole(
          attributes
        );

        /*
         * Go to the dashboard for the
         * mode the user selected.
         */
        navigateBySelectedRole();

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
          result.nextStep
            .signInStep
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

          await ensureSelectedRole(
            attributes
          );

          navigateBySelectedRole();
        } catch (
          roleError
        ) {
          console.error(
            "Unable to update account roles:",
            roleError
          );

          setError(
            "Unable to update your SwiftDrop account."
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
       * User doesn't exist.
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
       * Cognito custom attribute
       * doesn't exist yet.
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
          "Your SwiftDrop account configuration needs to be updated. Please try again after the account roles attribute is enabled."
        );

        return;
      }

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
              fontSize:
                "12px",
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
              ? "Driver"
              : "Orderer"}
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

          <p className="signup-text">

            Don't have an account?{" "}

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