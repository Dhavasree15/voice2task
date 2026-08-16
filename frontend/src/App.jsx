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
// DATABASE TASK → FRONTEND TASK
// ============================================================

function mapDatabaseTask(row) {
  return {
    id: row.id,
    text: row.task,
    time: row.start_time || row.end_time || "",
    start_time: row.start_time || "",
    end_time: row.end_time || "",
    done: Boolean(row.completed),
  };
}


// ============================================================
// LANDING ROUTE
// ============================================================

function LandingRoute({
  latestResult,
}) {
  const navigate = useNavigate();

  return (
    <LandingPage
      latestResult={latestResult}
      onStart={() => {
        navigate("/app");
      }}
    />
  );
}


// ============================================================
// APP ROUTE
// ============================================================

function AppRoute({
  user,
  tasks,
  latestResult,
  onResult,
  onTaskToggle,
}) {
  return (
    <AppScreen
      user={user}
      tasks={tasks}
      latestResult={latestResult}
      onResult={onResult}
      onTaskToggle={onTaskToggle}
    />
  );
}


// ============================================================
// USER ROUTES
// ============================================================

function UserRoutes({
  user,
  tasks,
  latestResult,
  onResult,
  onTaskToggle,
}) {
  return (
    <Routes>

      <Route
        path="/"
        element={
          <LandingRoute
            latestResult={latestResult}
          />
        }
      />

      <Route
        path="/app"
        element={
          <AppRoute
            user={user}
            tasks={tasks}
            latestResult={latestResult}
            onResult={onResult}
            onTaskToggle={onTaskToggle}
          />
        }
      />

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

  const [tasks, setTasks] =
    useState([]);

  const [latestResult, setLatestResult] =
    useState(null);


  // ==========================================================
  // LOAD TASKS FROM SUPABASE
  // ==========================================================

  const loadTasks = async (
    currentUser
  ) => {

    if (!currentUser) {

      setTasks([]);

      return [];
    }


    try {

      console.log(
        "Loading tasks for:",
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

        return [];

      }


      const loadedTasks =
        (data || []).map(
          mapDatabaseTask
        );


      console.log(
        "Loaded tasks:",
        loadedTasks
      );


      setTasks(
        loadedTasks
      );


      setLatestResult(
        previous => {

          if (
            loadedTasks.length === 0
          ) {

            return previous;

          }


          return {
            transcript:
              previous?.transcript || "",

            tasks:
              loadedTasks,

            reminder:
              previous?.reminder || "",
          };

        }
      );


      return loadedTasks;

    } catch (error) {

      console.error(
        "Unexpected task loading error:",
        error
      );

      return [];

    }

  };


  // ==========================================================
  // SAVE EXTRACTED RESULT
  // ==========================================================

  const handleResult = async (
    result
  ) => {

    if (!result) {
      return [];
    }


    // --------------------------------------------------------
    // Immediately update UI
    // --------------------------------------------------------

    setLatestResult(
      previous => ({
        transcript:
          result.transcript ||
          previous?.transcript ||
          "",

        reminder:
          result.reminder ||
          previous?.reminder ||
          "",

        tasks:
          result.tasks ||
          previous?.tasks ||
          [],
      })
    );


    if (!user) {

      console.error(
        "Cannot save tasks because no user is logged in."
      );

      return [];
    }


    if (
      !Array.isArray(
        result.tasks
      ) ||
      result.tasks.length === 0
    ) {

      console.log(
        "No tasks to save."
      );

      return [];

    }


    try {

      // ------------------------------------------------------
      // Prepare database rows
      // ------------------------------------------------------

      const rows =
        result.tasks.map(
          task => ({

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
        "Saving rows:",
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
        .insert(
          rows
        )
        .select(
          "id, task, start_time, end_time, completed, created_at"
        );


      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );

        alert(
          `Could not save tasks:\n\n${error.message}`
        );

        return [];

      }


      const newTasks =
        (data || []).map(
          mapDatabaseTask
        );


      console.log(
        "New tasks saved:",
        newTasks
      );


      // ------------------------------------------------------
      // IMPORTANT:
      // Merge new tasks with existing tasks.
      // ------------------------------------------------------

      setTasks(
        previous => {

          const existingIds =
            new Set(
              previous.map(
                task => task.id
              )
            );


          const uniqueNewTasks =
            newTasks.filter(
              task =>
                !existingIds.has(
                  task.id
                )
            );


          return [
            ...uniqueNewTasks,
            ...previous,
          ];

        }
      );


      setLatestResult(
        previous => {

          const previousTasks =
            previous?.tasks || [];


          return {

            transcript:
              result.transcript ||
              previous?.transcript ||
              "",

            reminder:
              result.reminder ||
              previous?.reminder ||
              "",

            tasks: [
              ...newTasks,
              ...previousTasks,
            ],

          };

        }
      );


      // ------------------------------------------------------
      // Return saved tasks to AppScreen
      // ------------------------------------------------------

      return newTasks;

    } catch (error) {

      console.error(
        "Unexpected Supabase save error:",
        error
      );

      return [];

    }

  };


  // ==========================================================
  // TOGGLE TASK
  // ==========================================================

  const handleTaskToggle = async (
    taskId,
    completed
  ) => {

    if (!user) {
      return;
    }


    try {

      const {
        error,
      } = await supabase
        .from("tasks")
        .update({
          completed:
            completed,
        })
        .eq(
          "id",
          taskId
        )
        .eq(
          "user_id",
          user.id
        );


      if (error) {

        console.error(
          "Failed to update task:",
          error
        );

        return;

      }


      // ------------------------------------------------------
      // Update global task state
      // ------------------------------------------------------

      setTasks(
        previous =>
          previous.map(
            task =>
              task.id === taskId
                ? {
                    ...task,
                    done:
                      completed,
                  }
                : task
          )
      );


      // ------------------------------------------------------
      // Update latest result
      // ------------------------------------------------------

      setLatestResult(
        previous => {

          if (!previous) {
            return previous;
          }


          return {

            ...previous,

            tasks:
              (previous.tasks || [])
                .map(
                  task =>
                    task.id === taskId
                      ? {
                          ...task,
                          done:
                            completed,
                        }
                      : task
                ),

          };

        }
      );


    } catch (error) {

      console.error(
        "Unexpected task update error:",
        error
      );

    }

  };


  // ==========================================================
  // LOAD SESSION
  // ==========================================================

  useEffect(() => {

    let mounted = true;


    const loadSession =
      async () => {

        try {

          const {
            data,
            error,
          } =
            await supabase.auth.getSession();


          if (error) {

            console.error(
              "Session error:",
              error
            );

          }


          if (!mounted) {
            return;
          }


          const currentUser =
            data?.session?.user ||
            null;


          setUser(
            currentUser
          );


          if (currentUser) {

            await loadTasks(
              currentUser
            );

          }


          if (mounted) {

            setLoading(
              false
            );

          }

        } catch (error) {

          console.error(
            "Session loading error:",
            error
          );


          if (mounted) {

            setUser(null);

            setLoading(false);

          }

        }

      };


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
            session?.user ||
            null;


          setUser(
            currentUser
          );


          if (currentUser) {

            await loadTasks(
              currentUser
            );

          } else {

            setTasks([]);

            setLatestResult(null);

          }

        }
      );


    return () => {

      mounted =
        false;

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
  // AUTH
  // ==========================================================

  if (!user) {

    return <Auth />;

  }


  // ==========================================================
  // APP
  // ==========================================================

  return (
    <UserRoutes
      user={user}
      tasks={tasks}
      latestResult={latestResult}
      onResult={handleResult}
      onTaskToggle={
        handleTaskToggle
      }
    />
  );

}


// ============================================================
// ROOT
// ============================================================

function App() {

  return (
    <BrowserRouter>

      <Application />

    </BrowserRouter>
  );

}


export default App;