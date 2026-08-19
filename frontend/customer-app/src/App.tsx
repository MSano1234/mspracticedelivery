import { Routes, Route } from "react-router-dom";

import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ConfirmSignup from "./pages/ConfirmSignup";
import Home from "./pages/Home";
import CreateDelivery from "./pages/CreateDelivery";
import TrackDelivery from "./pages/TrackDelivery";
import DriverDashboard from "./pages/DriverDashboard";

function App() {
  return (
    <Routes>
      {/* Unified entry point */}
      <Route
        path="/"
        element={<Welcome />}
      />

      {/* Authentication */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route
        path="/confirm-signup"
        element={<ConfirmSignup />}
      />

      {/* Orderer */}
      <Route
        path="/home"
        element={<Home />}
      />

      <Route
        path="/create-delivery"
        element={<CreateDelivery />}
      />

      {/* Track a specific delivery */}
      <Route
        path="/track-delivery/:deliveryId"
        element={<TrackDelivery />}
      />

      {/* Keep compatibility with the old route */}
      <Route
        path="/track-delivery"
        element={<TrackDelivery />}
      />

      {/* Driver */}
      <Route
        path="/driver-dashboard"
        element={<DriverDashboard />}
      />
    </Routes>
  );
}

export default App;