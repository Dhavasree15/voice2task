import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AppScreen from "./pages/AppScreen";
import Auth from "./Auth";

import { supabase } from "./supabaseClient";


// ============================================================
// LANDING PAGE ROUTE
// ============================================================

function LandingRoute({ latestResult }) {
  const navigate = useNavigate();

  return (
    <LandingPage
      latestResult={latestResult}
      onStart={() => navigate("/app")}
    />
  );
}


// ============================================================
// APP SCREEN ROUTE
// ============================================================

function AppRoute({ user, onResult }) {
  return (
    <AppScreen
      user={user}
      onResult={onResult}
    />
  );
}


// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

function UserRoutes({
  user,
  latestResult,
  setLatestResult,
}) {
  return (
    <Routes>

      {/* ------------------------------------------------------
          LANDING PAGE
      ------------------------------------------------------ */}

      <Route
        path="/"
        element={
          <LandingRoute
            latestResult={latestResult}
          />
        }
      />


      {/* ------------------------------------------------------
          VOICE2TASK APP
      ------------------------------------------------------ */}

      <Route
        path="/app"
        element={
          <AppRoute
            user={user}
            onResult={setLatestResult}
          />
        }
      />


      {/* ------------------------------------------------------
          UNKNOWN ROUTE
      ------------------------------------------------------ */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


// ============================================================
// MAIN APPLICATION
// ============================================================

function Application() {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  // This is the important state.
  // AppScreen sends the extracted result here.
  const [latestResult, setLatestResult] = useState(null);


  // ==========================================================
  // LOAD SUPABASE SESSION
  // ==========================================================

  useEffect(() => {

    let mounted = true;


    async function loadSession() {

      try {

        const {
          data,
          error,
        } = await supabase.auth.getSession();


        if (error) {
          console.error(
            "Supabase session error:",
            error
          );
        }


        if (mounted) {

          setUser(
            data?.session?.user ?? null
          );

          setLoading(false);

        }

      } catch (error) {

        console.error(
          "Failed to load Supabase session:",
          error
        );

        if (mounted) {

          setUser(null);

          setLoading(false);

        }

      }
    }


    loadSession();


    // ========================================================
    // AUTH STATE LISTENER
    // ========================================================

    const {
      data: {
        subscription,
      },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {

        if (!mounted) {
          return;
        }

        setUser(
          session?.user ?? null
        );

      }
    );


    return () => {

      mounted = false;

      subscription.unsubscribe();

    };

  }, []);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {

    return (
      <div className="loading-screen">

        <div className="loading-content">

          <div className="loading-dot"></div>

          <h2>
            Voice2Task
          </h2>

          <p>
            Loading your workspace...
          </p>

        </div>

      </div>
    );
  }


  // ==========================================================
  // LOGIN
  // ==========================================================

  if (!user) {
    return <Auth />;
  }


  // ==========================================================
  // APPLICATION
  // ==========================================================

  return (
    <UserRoutes
      user={user}
      latestResult={latestResult}
      setLatestResult={setLatestResult}
    />
  );
}


// ============================================================
// ROOT APP
// ============================================================

function App() {

  return (
    <BrowserRouter>
      <Application />
    </BrowserRouter>
  );
}


export default App;