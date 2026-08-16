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

    text: row.task || "",

    time:
      row.start_time ||
      row.end_time ||
      "",

    start_time:
      row.start_time ||
      "",

    end_time:
      row.end_time ||
      "",

    done: Boolean(row.completed),
  };
}


// ============================================================
// LANDING ROUTE
// ============================================================

function LandingRoute({ latestResult }) {
  const navigate = useNavigate();

  return (
    <LandingPage
      latestResult={latestResult}
      onStart={() => {
        window.scrollTo(0, 0);
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
// ROUTES
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
  // LOCAL STORAGE KEY
  // ==========================================================

  const getStorageKey = (userId) => {
    return `voice2task_latest_${userId}`;
  };


  // ==========================================================
  // SAVE LATEST RESULT LOCALLY
  // ==========================================================

  const saveLocalResult = (userId, result) => {

    if (!userId || !result) {
      return;
    }

    try {

      localStorage.setItem(
        getStorageKey(userId),
        JSON.stringify(result)
      );

      console.log(
        "LOCAL RESULT SAVED:",
        result
      );

    } catch (error) {

      console.error(
        "Could not save local result:",
        error
      );

    }
  };


  // ==========================================================
  // LOAD LATEST RESULT LOCALLY
  // ==========================================================

  const loadLocalResult = (userId) => {

    if (!userId) {
      return null;
    }

    try {

      const stored =
        localStorage.getItem(
          getStorageKey(userId)
        );

      if (!stored) {
        return null;
      }

      const parsed =
        JSON.parse(stored);

      console.log(
        "LOCAL RESULT LOADED:",
        parsed
      );

      return parsed;

    } catch (error) {

      console.error(
        "Could not load local result:",
        error
      );

      return null;
    }
  };


  // ==========================================================
  // LOAD TASKS FROM SUPABASE
  // ==========================================================

  const loadTasks = async (currentUser) => {

    if (!currentUser) {

      setTasks([]);

      setLatestResult(null);

      return [];
    }


    try {

      console.log(
        "================================"
      );

      console.log(
        "LOADING TASKS"
      );

      console.log(
        "USER:",
        currentUser.id
      );

      console.log(
        "================================"
      );


      // ------------------------------------------------------
      // LOAD LOCAL RESULT FIRST
      // ------------------------------------------------------

      const localResult =
        loadLocalResult(
          currentUser.id
        );


      const localTasks =
        Array.isArray(
          localResult?.tasks
        )
          ? localResult.tasks
          : [];


      // ------------------------------------------------------
      // SHOW LOCAL DATA IMMEDIATELY
      //
      // This is important because the user should NEVER
      // see an empty AppScreen while Supabase is loading.
      // ------------------------------------------------------

      if (localResult) {

        setLatestResult(
          localResult
        );

      }

      if (localTasks.length > 0) {

        setTasks(
          localTasks
        );

      }


      // ------------------------------------------------------
      // LOAD FROM SUPABASE
      // ------------------------------------------------------

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


      // ------------------------------------------------------
      // SUPABASE ERROR
      // ------------------------------------------------------

      if (error) {

        console.error(
          "SUPABASE LOAD ERROR:",
          error
        );


        // Keep local tasks instead of deleting them.

        if (localTasks.length > 0) {

          setTasks(
            localTasks
          );

        }


        return localTasks;
      }


      // ------------------------------------------------------
      // DATABASE TASKS
      // ------------------------------------------------------

      const databaseTasks =
        (data || []).map(
          mapDatabaseTask
        );


      console.log(
        "TASKS FROM SUPABASE:",
        databaseTasks
      );


      // ======================================================
      // IMPORTANT FIX
      //
      // If Supabase has tasks → use them.
      //
      // If Supabase is empty → use local tasks.
      //
      // Previously App.jsx always did:
      //
      // setTasks(loadedTasks)
      //
      // which erased the locally loaded task.
      // ======================================================

      const effectiveTasks =
        databaseTasks.length > 0
          ? databaseTasks
          : localTasks;


      console.log(
        "FINAL TASKS FOR APPSCREEN:",
        effectiveTasks
      );


      // ------------------------------------------------------
      // SET THE ACTUAL TASK STATE
      // ------------------------------------------------------

      setTasks(
        effectiveTasks
      );


      // ------------------------------------------------------
      // BUILD RESULT FOR LANDING PAGE
      // ------------------------------------------------------

      if (
        localResult ||
        effectiveTasks.length > 0
      ) {

        const finalResult = {

          transcript:
            localResult?.transcript ||
            "",

          reminder:
            localResult?.reminder ||
            "",

          tasks:
            effectiveTasks,

        };


        setLatestResult(
          finalResult
        );


        // Keep local storage synchronized.

        saveLocalResult(
          currentUser.id,
          finalResult
        );

      }


      return effectiveTasks;

    } catch (error) {

      console.error(
        "UNEXPECTED TASK LOADING ERROR:",
        error
      );


      // ------------------------------------------------------
      // FALLBACK TO LOCAL DATA
      // ------------------------------------------------------

      const localResult =
        loadLocalResult(
          currentUser.id
        );


      const localTasks =
        Array.isArray(
          localResult?.tasks
        )
          ? localResult.tasks
          : [];


      if (localResult) {

        setLatestResult(
          localResult
        );

      }


      setTasks(
        localTasks
      );


      return localTasks;
    }
  };


  // ==========================================================
  // HANDLE EXTRACTED RESULT
  // ==========================================================

  const handleResult = async (result) => {

    if (!result) {
      return [];
    }


    console.log(
      "================================"
    );

    console.log(
      "RESULT RECEIVED FROM APPSCREEN"
    );

    console.log(
      result
    );

    console.log(
      "================================"
    );


    // ======================================================
    // PREPARE RESULT
    // ======================================================

    const immediateResult = {

      transcript:
        result.transcript ||
        "",

      reminder:
        result.reminder ||
        "",

      tasks:
        Array.isArray(
          result.tasks
        )
          ? result.tasks
          : [],

    };


    // ======================================================
    // SHOW IMMEDIATELY
    // ======================================================

    setLatestResult(
      immediateResult
    );


    setTasks(
      immediateResult.tasks
    );


    // ======================================================
    // SAVE LOCALLY IMMEDIATELY
    // ======================================================

    if (user) {

      saveLocalResult(
        user.id,
        immediateResult
      );

    }


    // ======================================================
    // CHECK LOGIN
    // ======================================================

    if (!user) {

      console.error(
        "NO AUTHENTICATED USER"
      );


      alert(
        "You are not logged in. Please login again."
      );


      return immediateResult.tasks;
    }


    // ======================================================
    // CHECK TASKS
    // ======================================================

    if (
      !Array.isArray(
        immediateResult.tasks
      ) ||
      immediateResult.tasks.length === 0
    ) {

      console.log(
        "No extracted tasks to save."
      );

      return [];
    }


    // ======================================================
    // PREPARE DATABASE ROWS
    // ======================================================

    const rows =
      immediateResult.tasks.map(
        (task) => ({

          user_id:
            user.id,

          task:
            task.text ||
            task.title ||
            task.task ||
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
      "================================"
    );

    console.log(
      "SAVING TASKS TO SUPABASE"
    );

    console.log(
      rows
    );

    console.log(
      "================================"
    );


    // ======================================================
    // INSERT
    // ======================================================

    try {

      const {
        data,
        error,
      } =
        await supabase

          .from("tasks")

          .insert(
            rows
          )

          .select(
            "id, task, start_time, end_time, completed, created_at"
          );


      // ====================================================
      // ERROR
      // ====================================================

      if (error) {

        console.error(
          "SUPABASE INSERT ERROR:",
          error
        );


        alert(
          "SUPABASE ERROR\n\n" +
          error.message +
          "\n\nCode: " +
          (
            error.code ||
            "N/A"
          )
        );


        // Keep the task visible.

        return immediateResult.tasks;
      }


      // ====================================================
      // SUCCESS
      // ====================================================

      console.log(
        "================================"
      );

      console.log(
        "TASKS SAVED SUCCESSFULLY"
      );

      console.log(
        data
      );

      console.log(
        "================================"
      );


      // ====================================================
      // MAP DATABASE TASKS
      // ====================================================

      const savedTasks =
        (data || []).map(
          mapDatabaseTask
        );


      // ====================================================
      // USE DATABASE IDS
      // ====================================================

      if (
        savedTasks.length > 0
      ) {

        const finalResult = {

          transcript:
            immediateResult.transcript,

          reminder:
            immediateResult.reminder,

          tasks:
            savedTasks,

        };


        setTasks(
          savedTasks
        );


        setLatestResult(
          finalResult
        );


        saveLocalResult(
          user.id,
          finalResult
        );


        return savedTasks;
      }


      // ====================================================
      // FALLBACK
      // ====================================================

      return immediateResult.tasks;

    } catch (error) {

      console.error(
        "UNEXPECTED SUPABASE ERROR:",
        error
      );


      alert(
        "SUPABASE ERROR\n\n" +
        (
          error?.message ||
          String(error)
        )
      );


      // Never remove the task from the UI.

      return immediateResult.tasks;
    }
  };


  // ==========================================================
  // TOGGLE TASK
  // ==========================================================

  const handleTaskToggle =
    async (
      taskId,
      completed
    ) => {

      if (!user) {
        return;
      }


      // ------------------------------------------------------
      // UPDATE FRONTEND IMMEDIATELY
      // ------------------------------------------------------

      setTasks(
        (previous) =>
          previous.map(
            (task) =>
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
      // UPDATE LANDING PAGE RESULT
      // ------------------------------------------------------

      setLatestResult(
        (previous) => {

          if (!previous) {
            return previous;
          }


          const updatedTasks =
            (
              previous.tasks ||
              []
            ).map(
              (task) =>
                task.id === taskId
                  ? {
                      ...task,
                      done:
                        completed,
                    }
                  : task
            );


          const updatedResult = {

            ...previous,

            tasks:
              updatedTasks,

          };


          saveLocalResult(
            user.id,
            updatedResult
          );


          return updatedResult;
        }
      );


      // ------------------------------------------------------
      // UPDATE SUPABASE
      // ------------------------------------------------------

      if (!taskId) {
        return;
      }


      try {

        const {
          error,
        } =
          await supabase

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
            "TASK UPDATE ERROR:",
            error
          );

        }

      } catch (error) {

        console.error(
          "UNEXPECTED TASK UPDATE ERROR:",
          error
        );

      }
    };


  // ==========================================================
  // LOAD AUTHENTICATION
  // ==========================================================

  useEffect(() => {

    let mounted =
      true;


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
              "SESSION ERROR:",
              error
            );

          }


          if (!mounted) {
            return;
          }


          const currentUser =
            data?.session?.user ||
            null;


          console.log(
            "CURRENT SUPABASE USER:",
            currentUser
          );


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
            "SESSION LOAD ERROR:",
            error
          );


          if (mounted) {

            setUser(null);

            setLoading(
              false
            );

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


          console.log(
            "AUTH STATE:",
            _event,
            currentUser
          );


          setUser(
            currentUser
          );


          if (currentUser) {

            await loadTasks(
              currentUser
            );

          } else {

            setTasks([]);

            setLatestResult(
              null
            );

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
  // AUTH
  // ==========================================================

  if (!user) {

    return (
      <Auth />
    );
  }


  // ==========================================================
  // APPLICATION
  // ==========================================================

  return (

    <UserRoutes

      user={
        user
      }

      tasks={
        tasks
      }

      latestResult={
        latestResult
      }

      onResult={
        handleResult
      }

      onTaskToggle={
        handleTaskToggle
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