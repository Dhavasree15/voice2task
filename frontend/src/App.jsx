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


  // ==========================================================
  // LOAD SAVED RESULT
  // ==========================================================

  const [latestResult, setLatestResult] = useState(() => {

    try {

      const saved =
        localStorage.getItem(
          "voice2task_latest_result"
        );

      return saved
        ? JSON.parse(saved)
        : null;

    } catch (error) {

      console.error(
        "Failed to load saved result:",
        error
      );

      return null;
    }

  });


  // ==========================================================
  // SAVE RESULT
  // ==========================================================

  const handleResult = (result) => {

    // Update React state immediately
    setLatestResult(result);


    try {

      if (result) {

        // Save latest transcript/tasks/reminder
        localStorage.setItem(
          "voice2task_latest_result",
          JSON.stringify(result)
        );

      } else {

        // Clear saved result when AppScreen sends null
        localStorage.removeItem(
          "voice2task_latest_result"
        );

      }

    } catch (error) {

      console.error(
        "Failed to save latest result:",
        error
      );

    }

  };


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
  // LOADING SCREEN
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
  // LOGIN / AUTHENTICATION
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

      setLatestResult={handleResult}

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