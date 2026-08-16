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
    id:
      row.id,

    text:
      row.task || "",

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

    done:
      Boolean(
        row.completed
      ),
  };
}


// ============================================================
// LANDING ROUTE
// ============================================================

function LandingRoute({
  latestResult,
}) {

  const navigate =
    useNavigate();


  return (
    <LandingPage

      latestResult={
        latestResult
      }

      onStart={() => {

        window.scrollTo(
          0,
          0
        );

        navigate(
          "/app"
        );

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
        onResult
      }

      onTaskToggle={
        onTaskToggle
      }

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

      {/* ==================================================
          LANDING PAGE
      ================================================== */}

      <Route
        path="/"
        element={
          <LandingRoute
            latestResult={
              latestResult
            }
          />
        }
      />


      {/* ==================================================
          VOICE2TASK APP
      ================================================== */}

      <Route
        path="/app"
        element={
          <AppRoute

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
              onResult
            }

            onTaskToggle={
              onTaskToggle
            }

          />
        }
      />


      {/* ==================================================
          UNKNOWN ROUTE
      ================================================== */}

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

  const getStorageKey =
    (userId) =>
      `voice2task_latest_${userId}`;


  // ==========================================================
  // SAVE LATEST RESULT LOCALLY
  // ==========================================================

  const saveLocalResult =
    (userId, result) => {

      if (
        !userId ||
        !result
      ) {

        return;

      }


      try {

        localStorage.setItem(

          getStorageKey(
            userId
          ),

          JSON.stringify(
            result
          )

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

  const loadLocalResult =
    (userId) => {

      if (!userId) {

        return null;

      }


      try {

        const stored =
          localStorage.getItem(
            getStorageKey(
              userId
            )
          );


        if (!stored) {

          return null;

        }


        return JSON.parse(
          stored
        );

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

  const loadTasks =
    async (
      currentUser
    ) => {

      if (!currentUser) {

        setTasks([]);

        return [];

      }


      try {

        console.log(
          "Loading tasks from Supabase for:",
          currentUser.id
        );


        const {
          data,
          error,
        } =
          await supabase

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
                ascending:
                  false,
              }
            );


        // ----------------------------------------------------
        // SUPABASE LOAD ERROR
        // ----------------------------------------------------

        if (error) {

          console.error(
            "SUPABASE LOAD ERROR:",
            error
          );


          const localResult =
            loadLocalResult(
              currentUser.id
            );


          if (localResult) {

            setLatestResult(
              localResult
            );


            setTasks(
              localResult.tasks ||
              []
            );

          }


          return [];

        }


        // ----------------------------------------------------
        // CONVERT DATABASE TASKS
        // ----------------------------------------------------

        const loadedTasks =
          (data || []).map(
            mapDatabaseTask
          );


        console.log(
          "TASKS LOADED FROM SUPABASE:",
          loadedTasks
        );


        setTasks(
          loadedTasks
        );


        // ----------------------------------------------------
        // LOAD LOCAL RESULT FOR TRANSCRIPT / REMINDER
        // ----------------------------------------------------

        const localResult =
          loadLocalResult(
            currentUser.id
          );


        if (localResult) {

          setLatestResult({

            transcript:
              localResult.transcript ||
              "",

            reminder:
              localResult.reminder ||
              "",

            tasks:
              loadedTasks.length > 0
                ? loadedTasks
                : (
                    localResult.tasks ||
                    []
                  ),

          });

        }


        // ----------------------------------------------------
        // IF DATABASE HAS TASKS BUT LOCAL RESULT DOESN'T
        // ----------------------------------------------------

        else if (
          loadedTasks.length > 0
        ) {

          const databaseResult = {

            transcript:
              "",

            reminder:
              "",

            tasks:
              loadedTasks,

          };


          setLatestResult(
            databaseResult
          );


          saveLocalResult(
            currentUser.id,
            databaseResult
          );

        }


        return loadedTasks;

      } catch (error) {

        console.error(
          "Unexpected task loading error:",
          error
        );


        const localResult =
          loadLocalResult(
            currentUser.id
          );


        if (localResult) {

          setLatestResult(
            localResult
          );


          setTasks(
            localResult.tasks ||
            []
          );

        }


        return [];

      }

    };


  // ==========================================================
  // HANDLE EXTRACTED RESULT
  // ==========================================================

  const handleResult =
    async (
      result
    ) => {

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
      // 1. PREPARE RESULT
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
      // 2. SHOW RESULT IMMEDIATELY
      // ======================================================

      setLatestResult(
        immediateResult
      );


      setTasks(
        immediateResult.tasks
      );


      // ======================================================
      // 3. SAVE LOCAL RESULT
      // ======================================================

      if (user) {

        saveLocalResult(

          user.id,

          immediateResult

        );

      }


      // ======================================================
      // 4. CHECK LOGIN
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
      // 5. CHECK EXTRACTED TASKS
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
      // 6. PREPARE DATABASE ROWS
      // ======================================================

      const rows =
        immediateResult.tasks.map(
          task => ({

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
      // 7. INSERT
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
        // SUPABASE ERROR
        // ====================================================

        if (error) {

          console.error(
            "================================"
          );

          console.error(
            "SUPABASE INSERT ERROR"
          );

          console.error(
            error
          );

          console.error(
            "================================"
          );


          alert(

            "SUPABASE ERROR\n\n" +

            error.message +

            "\n\nCode: " +

            (
              error.code ||
              "N/A"
            ) +

            "\n\nDetails: " +

            (
              error.details ||
              "N/A"
            )

          );


          // --------------------------------------------------
          // IMPORTANT:
          // KEEP THE EXTRACTED TASK ON SCREEN
          // --------------------------------------------------

          return (
            immediateResult.tasks
          );

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
        // CONVERT DATABASE ROWS
        // ====================================================

        const savedTasks =
          (data || []).map(
            mapDatabaseTask
          );


        // ====================================================
        // DATABASE TASKS AVAILABLE
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

        return (
          immediateResult.tasks
        );

      } catch (error) {

        console.error(
          "================================"
        );

        console.error(
          "UNEXPECTED SUPABASE ERROR"
        );

        console.error(
          error
        );

        console.error(
          "================================"
        );


        alert(

          "SUPABASE ERROR\n\n" +

          (
            error?.message ||
            String(error)
          )

        );


        // ----------------------------------------------------
        // DO NOT DELETE THE TASK FROM UI
        // ----------------------------------------------------

        return (
          immediateResult.tasks
        );

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
      // UPDATE LATEST RESULT
      // ------------------------------------------------------

      setLatestResult(
        previous => {

          if (!previous) {

            return previous;

          }


          const updatedTasks =
            (
              previous.tasks ||
              []
            ).map(
              task =>
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
  // LOAD AUTHENTICATED USER
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


          if (
            currentUser
          ) {

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

            setUser(
              null
            );

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


          if (
            currentUser
          ) {

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