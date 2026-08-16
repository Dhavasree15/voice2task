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

  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);


  // ==========================================================
  // LATEST RESULT
  // ==========================================================

  const [latestResult, setLatestResult] =
    useState(null);


  // ==========================================================
  // LOAD SAVED TASKS FROM SUPABASE
  // ==========================================================

  const loadSavedTasks = async (currentUser) => {

    if (!currentUser) {
      return;
    }


    try {

      console.log(
        "Loading saved tasks for user:",
        currentUser.id
      );


      const {
        data,
        error,
      } = await supabase
        .from("tasks")
        .select(
          "id, task, start_time, end_time, completed, created_at"
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );


      if (error) {

        console.error(
          "Failed to load tasks:",
          error
        );

        return;
      }


      console.log(
        "Saved tasks loaded:",
        data
      );


      if (
        !data ||
        data.length === 0
      ) {

        setLatestResult(null);

        return;
      }


      // ------------------------------------------------------
      // Convert Supabase format into application format
      // ------------------------------------------------------

      const tasks =
        data.map(
          (row) => ({

            id:
              row.id,

            text:
              row.task,

            time:
              row.start_time ||
              row.end_time ||
              "",

            done:
              Boolean(
                row.completed
              ),

          })
        );


      setLatestResult({

        transcript:
          "",

        tasks:
          tasks,

        reminder:
          "",

      });


    } catch (error) {

      console.error(
        "Unexpected task loading error:",
        error
      );

    }

  };


  // ==========================================================
  // SAVE RESULT
  // ==========================================================

  const handleResult = async (
    result
  ) => {

    // --------------------------------------------------------
    // Update React immediately
    // --------------------------------------------------------

    setLatestResult(
      result
    );


    // --------------------------------------------------------
    // If AppScreen sends null
    // --------------------------------------------------------

    if (!result) {

      return;

    }


    // --------------------------------------------------------
    // No logged-in user
    // --------------------------------------------------------

    if (!user) {

      console.error(
        "Cannot save tasks because no user is logged in."
      );

      return;

    }


    // --------------------------------------------------------
    // Make sure tasks exist
    // --------------------------------------------------------

    if (
      !Array.isArray(
        result.tasks
      ) ||
      result.tasks.length === 0
    ) {

      console.log(
        "No tasks to save."
      );

      return;

    }


    try {

      console.log(
        "Saving tasks to Supabase..."
      );


      // ------------------------------------------------------
      // Prepare rows
      // ------------------------------------------------------

      const rows =
        result.tasks.map(
          (task) => ({

            user_id:
              user.id,

            task:
              task.text ||
              task.title ||
              "Untitled task",

            start_time:
              task.start_time ||
              task.time ||
              null,

            end_time:
              task.end_time ||
              null,

            completed:
              Boolean(
                task.done
              ),

          })
        );


      console.log(
        "Rows going to Supabase:",
        rows
      );


      // ------------------------------------------------------
      // INSERT
      // ------------------------------------------------------

      const {
        data,
        error,
      } = await supabase
        .from("tasks")
        .insert(rows)
        .select();


      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );

        alert(
          `Could not save tasks.\n\n${error.message}`
        );

        return;
      }


      console.log(
        "Tasks successfully saved:",
        data
      );


      // ------------------------------------------------------
      // Put Supabase IDs into local result
      // ------------------------------------------------------

      if (data) {

        const savedTasks =
          data.map(
            (row) => ({

              id:
                row.id,

              text:
                row.task,

              time:
                row.start_time ||
                row.end_time ||
                "",

              done:
                Boolean(
                  row.completed
                ),

            })
          );


        const updatedResult = {

          ...result,

          tasks:
            savedTasks,

        };


        setLatestResult(
          updatedResult
        );

      }


    } catch (error) {

      console.error(
        "Unexpected Supabase error:",
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
        } =
          await supabase.auth.getSession();


        if (error) {

          console.error(
            "Supabase session error:",
            error
          );

        }


        if (mounted) {

          const currentUser =
            data?.session?.user ??
            null;


          setUser(
            currentUser
          );


          // --------------------------------------------------
          // Load tasks belonging to this user
          // --------------------------------------------------

          if (currentUser) {

            await loadSavedTasks(
              currentUser
            );

          }


          setLoading(
            false
          );

        }


      } catch (error) {

        console.error(
          "Failed to load Supabase session:",
          error
        );


        if (mounted) {

          setUser(
            null
          );

          setLoading(
            false
          );

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
    } =
      supabase.auth.onAuthStateChange(
        async (
          _event,
          session
        ) => {

          if (!mounted) {

            return;

          }


          const currentUser =
            session?.user ??
            null;


          setUser(
            currentUser
          );


          if (currentUser) {

            await loadSavedTasks(
              currentUser
            );

          } else {

            setLatestResult(
              null
            );

          }

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

      user={
        user
      }

      latestResult={
        latestResult
      }

      setLatestResult={
        handleResult
      }

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