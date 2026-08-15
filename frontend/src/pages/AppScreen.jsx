import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "./AppScreen.css";


function AppScreen({ user, onResult }) {

  const navigate = useNavigate();

  const recognitionRef = useRef(null);

  const timerIntervalRef = useRef(null);


  // ==========================================================
  // DEFAULT VALUES
  // ==========================================================

  const DEFAULT_TRANSCRIPT =
    "Click Start Recording and speak. Your words will appear live here.";


  // ==========================================================
  // STATE
  // ==========================================================

  const [isRecording, setIsRecording] =
    useState(false);

  const [seconds, setSeconds] =
    useState(0);

  const [transcript, setTranscript] =
    useState(DEFAULT_TRANSCRIPT);

  const [tasks, setTasks] =
    useState([]);

  const [detectedReminder, setDetectedReminder] =
    useState("No reminder detected");

  const [isSpeechSupported, setIsSpeechSupported] =
    useState(true);

  const [isExtracting, setIsExtracting] =
    useState(false);


  // ==========================================================
  // TASK COUNTS
  // ==========================================================

  const totalTasks = tasks.length;


  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (task) => task.done
      ).length,
    [tasks]
  );


  const pendingTasks =
    totalTasks - completedTasks;


  // ==========================================================
  // FORMAT TIMER
  // ==========================================================

  const formatTime = (totalSeconds) => {

    const mins = String(
      Math.floor(totalSeconds / 60)
    ).padStart(2, "0");


    const secs = String(
      totalSeconds % 60
    ).padStart(2, "0");


    return `${mins}:${secs}`;
  };


  // ==========================================================
  // TIMER
  // ==========================================================

  const stopTimer = () => {

    if (timerIntervalRef.current) {

      clearInterval(
        timerIntervalRef.current
      );

      timerIntervalRef.current = null;
    }
  };


  const startTimer = () => {

    stopTimer();


    timerIntervalRef.current =
      setInterval(() => {

        setSeconds(
          (previous) =>
            previous + 1
        );

      }, 1000);
  };


  // ==========================================================
  // START RECORDING
  // ==========================================================

  const handleStartRecording = () => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

      setIsSpeechSupported(false);

      alert(
        "Live speech recognition is not supported in this browser. Please use Chrome."
      );

      return;
    }


    // Stop previous recognition if one exists.

    if (recognitionRef.current) {

      try {

        recognitionRef.current.stop();

      } catch (error) {

        console.log(
          "Old recognition cleanup skipped:",
          error
        );

      }
    }


    try {

      const recognition =
        new SpeechRecognition();


      recognitionRef.current =
        recognition;


      recognition.continuous = true;

      recognition.interimResults = true;

      recognition.lang = "en-US";


      let finalTranscript = "";


      // ------------------------------------------------------
      // RECOGNITION START
      // ------------------------------------------------------

      recognition.onstart = () => {

        setIsRecording(true);

        setSeconds(0);

        setTasks([]);

        setDetectedReminder(
          "No reminder detected"
        );

        setTranscript(
          "Listening... speak now 🎙️"
        );

        startTimer();
      };


      // ------------------------------------------------------
      // SPEECH RESULT
      // ------------------------------------------------------

      recognition.onresult = (event) => {

        let interimTranscript = "";

        let updatedFinalTranscript =
          finalTranscript;


        for (
          let i = event.resultIndex;
          i < event.results.length;
          i++
        ) {

          const text =
            event.results[i][0].transcript;


          if (
            event.results[i].isFinal
          ) {

            updatedFinalTranscript +=
              text + " ";

          } else {

            interimTranscript += text;

          }
        }


        finalTranscript =
          updatedFinalTranscript;


        const combinedText =
          (
            updatedFinalTranscript +
            interimTranscript
          ).trim();


        setTranscript(
          combinedText ||
            "Listening... speak now 🎙️"
        );
      };


      // ------------------------------------------------------
      // SPEECH ERROR
      // ------------------------------------------------------

      recognition.onerror = (event) => {

        console.error(
          "Speech recognition error:",
          event.error
        );


        if (
          event.error !== "aborted"
        ) {

          alert(
            `Speech recognition error: ${event.error}`
          );

        }


        setIsRecording(false);

        stopTimer();
      };


      // ------------------------------------------------------
      // SPEECH END
      // ------------------------------------------------------

      recognition.onend = () => {

        setIsRecording(false);

        stopTimer();
      };


      recognition.start();

    } catch (error) {

      console.error(
        "Speech recognition start failed:",
        error
      );

      alert(
        "Could not start live speech recognition."
      );

      setIsRecording(false);

      stopTimer();
    }
  };


  // ==========================================================
  // STOP RECORDING
  // ==========================================================

  const handleStopRecording = () => {

    if (recognitionRef.current) {

      try {

        recognitionRef.current.stop();

      } catch (error) {

        console.log(
          "Stop recording issue:",
          error
        );
      }
    }


    stopTimer();

    setIsRecording(false);
  };


  // ==========================================================
  // RECORDING TOGGLE
  // ==========================================================

  const handleRecordingToggle = () => {

    if (isRecording) {

      handleStopRecording();

    } else {

      handleStartRecording();

    }
  };


  // ==========================================================
  // RESET
  // ==========================================================

  const handleReset = () => {

    if (recognitionRef.current) {

      try {

        recognitionRef.current.stop();

      } catch (error) {

        console.log(
          "Recognition reset stop skipped:",
          error
        );
      }
    }


    stopTimer();


    setIsRecording(false);

    setSeconds(0);

    setTranscript(
      DEFAULT_TRANSCRIPT
    );

    setTasks([]);

    setDetectedReminder(
      "No reminder detected"
    );

    setIsExtracting(false);


    // Clear landing page result too.

    if (onResult) {
      onResult(null);
    }
  };


  // ==========================================================
  // EXTRACT TASKS
  // ==========================================================

  const handleExtract = async () => {

    const cleanTranscript =
      transcript.trim();


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !cleanTranscript ||
      cleanTranscript ===
        DEFAULT_TRANSCRIPT ||
      cleanTranscript ===
        "Listening... speak now 🎙️"
    ) {

      alert(
        "Please record something first before extracting tasks."
      );

      return;
    }


    try {

      setIsExtracting(true);


      // ------------------------------------------------------
      // BACKEND URL
      // ------------------------------------------------------

      const apiUrl =
        import.meta.env.VITE_API_URL ||
        "http://127.0.0.1:8000";


      // ------------------------------------------------------
      // CALL FASTAPI
      // ------------------------------------------------------

      const response =
        await fetch(
          `${apiUrl}/extract-tasks`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              transcript:
                cleanTranscript,
            }),
          }
        );


      // ------------------------------------------------------
      // HTTP ERROR
      // ------------------------------------------------------

      if (!response.ok) {

        const errorText =
          await response.text();

        throw new Error(
          `Backend returned ${response.status}: ${errorText}`
        );
      }


      // ------------------------------------------------------
      // RESPONSE
      // ------------------------------------------------------

      const data =
        await response.json();


      console.log(
        "Backend extraction result:",
        data
      );


      // ------------------------------------------------------
      // NORMALIZE TASKS
      // ------------------------------------------------------

      const extractedTasks =
        Array.isArray(data.tasks)
          ? data.tasks.map(
              (task) => ({
                text:
                  task.text ||
                  task.title ||
                  "Untitled task",

                time:
                  task.time ||
                  "",

                done:
                  Boolean(
                    task.done
                  ),
              })
            )
          : [];


      const reminder =
        data.reminder ||
        "No reminder detected";


      // ------------------------------------------------------
      // UPDATE APP SCREEN
      // ------------------------------------------------------

      setTasks(
        extractedTasks
      );

      setDetectedReminder(
        reminder
      );


      // ------------------------------------------------------
      // SEND REAL DATA TO APP.JSX
      // ------------------------------------------------------

      if (onResult) {

        onResult({

          transcript:
            cleanTranscript,

          tasks:
            extractedTasks,

          reminder:
            reminder,

        });
      }


    } catch (error) {

      console.error(
        "Error extracting tasks:",
        error
      );


      alert(
        `Backend connection failed.\n\n${error.message}`
      );


      setTasks([]);

      setDetectedReminder(
        "No reminder detected"
      );


      if (onResult) {
        onResult(null);
      }

    } finally {

      setIsExtracting(false);

    }
  };


  // ==========================================================
  // TOGGLE TASK
  // ==========================================================

  const toggleTask = (index) => {

    const updatedTasks =
      [...tasks];


    updatedTasks[index] = {
      ...updatedTasks[index],

      done:
        !updatedTasks[index].done,
    };


    setTasks(
      updatedTasks
    );


    // Send updated tasks to LandingPage.

    if (onResult) {

      onResult({

        transcript,

        tasks:
          updatedTasks,

        reminder:
          detectedReminder,

      });
    }
  };


  // ==========================================================
  // SPEECH SUPPORT + CLEANUP
  // ==========================================================

  useEffect(() => {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

      setIsSpeechSupported(false);

    }


    return () => {

      stopTimer();


      if (recognitionRef.current) {

        try {

          recognitionRef.current.stop();

        } catch (error) {

          console.log(
            "Recognition cleanup skipped:",
            error
          );

        }
      }

    };

  }, []);


  // ==========================================================
  // TRANSCRIPT READY
  // ==========================================================

  const showTranscriptReady =
    transcript !== DEFAULT_TRANSCRIPT &&
    transcript !==
      "Listening... speak now 🎙️";


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="appscreen-page">

      <div className="screen-ambient ambient-a"></div>

      <div className="screen-ambient ambient-b"></div>


      <main className="appscreen-shell">


        {/* ==================================================
            TOP BAR
        ================================================== */}

        <header className="appscreen-topbar glass">

          <div className="screen-brand">

            <span className="screen-dot"></span>


            <div>

              <span className="screen-name">
                Voice2Task Studio
              </span>


              <p
                style={{
                  margin:
                    "4px 0 0",

                  fontSize:
                    "0.78rem",

                  color:
                    "#aeb8dc",

                  fontWeight:
                    500,
                }}
              >
                Turn your thoughts into tasks instantly
              </p>

            </div>

          </div>


          <div className="screen-actions">

            <button
              className="top-btn"
              onClick={() =>
                navigate("/")
              }
            >
              ← Home
            </button>


            <button className="top-btn active">

              {isRecording
                ? "Recording Live"
                : "AI Productivity"}

            </button>

          </div>

        </header>



        {/* ==================================================
            MAIN GRID
        ================================================== */}

        <section className="appscreen-grid">


          {/* =================================================
              LEFT COLUMN
          ================================================= */}

          <div className="left-stack">


            {/* -------------------------------------------------
                RECORDING PANEL
            ------------------------------------------------- */}

            <div className="screen-card glass record-panel">

              <div className="card-head">

                <div>

                  <p className="card-tag">
                    LIVE CAPTURE
                  </p>

                  <h2>
                    Voice Recorder
                  </h2>

                </div>


                <span className="live-pill">

                  {isRecording
                    ? "REC"
                    : "READY"}

                </span>

              </div>


              <div className="rec-center">

                <div className="rec-ring ring-one"></div>

                <div className="rec-ring ring-two"></div>

                <div className="rec-core">

                  {isRecording
                    ? "🎙️"
                    : "⏸️"}

                </div>

              </div>


              <div className="timer">

                {formatTime(seconds)}

              </div>


              <div className="wave-bars">

                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>

              </div>


              <div className="rec-buttons">

                <button
                  className="primary-action"
                  onClick={
                    handleRecordingToggle
                  }
                >

                  {isRecording
                    ? "Stop Recording"
                    : "Start Recording"}

                </button>


                <button
                  className="secondary-action"
                  onClick={handleReset}
                >
                  Reset
                </button>

              </div>

            </div>



            {/* -------------------------------------------------
                TRANSCRIPT PANEL
            ------------------------------------------------- */}

            <div className="screen-card glass transcript-panel">

              <div className="card-head">

                <div>

                  <p className="card-tag">
                    TRANSCRIPT
                  </p>

                  <h2>
                    Live Voice Text
                  </h2>

                </div>

              </div>


              <textarea
                rows="8"
                value={transcript}
                onChange={(event) =>
                  setTranscript(
                    event.target.value
                  )
                }
              />


              {!isSpeechSupported && (

                <p
                  style={{
                    marginTop:
                      "12px",

                    color:
                      "#ff9ed2",

                    fontSize:
                      "0.9rem",
                  }}
                >
                  Live speech recognition works best in Chrome.
                </p>

              )}

            </div>

          </div>



          {/* =================================================
              RIGHT COLUMN
          ================================================= */}

          <div className="screen-card glass todo-panel">


            <div className="todo-top">

              <div>

                <p className="card-tag">
                  AI OUTPUT
                </p>

                <h2>
                  Smart To-Do List
                </h2>

              </div>


              <button
                className="extract-action"
                onClick={handleExtract}
                disabled={isExtracting}
              >

                {isExtracting
                  ? "Extracting..."
                  : "Extract Tasks"}

              </button>

            </div>



            {/* ------------------------------------------------
                STATS
            ------------------------------------------------ */}

            <div className="stats-row">

              <div className="mini-stat">

                <span>
                  Total
                </span>

                <strong>
                  {totalTasks}
                </strong>

              </div>


              <div className="mini-stat">

                <span>
                  Done
                </span>

                <strong>
                  {completedTasks}
                </strong>

              </div>


              <div className="mini-stat">

                <span>
                  Pending
                </span>

                <strong>
                  {pendingTasks}
                </strong>

              </div>

            </div>



            {/* ------------------------------------------------
                TASK LIST
            ------------------------------------------------ */}

            <div className="task-list">

              {tasks.length > 0 ? (

                tasks.map(
                  (task, index) => (

                    <div
                      key={index}
                      className={`task-item ${
                        task.done
                          ? "done"
                          : ""
                      }`}
                    >

                      <div className="task-left">

                        <input
                          type="checkbox"
                          checked={
                            Boolean(
                              task.done
                            )
                          }
                          onChange={() =>
                            toggleTask(
                              index
                            )
                          }
                        />


                        <span>
                          {task.text}
                        </span>

                      </div>


                      {task.time && (

                        <span className="time-chip">
                          {task.time}
                        </span>

                      )}

                    </div>

                  )
                )

              ) : (

                <div className="task-item">

                  <div className="task-left">

                    <span>

                      {showTranscriptReady
                        ? "Transcript ready ✨ Tap Extract Tasks to generate your smart checklist."
                        : "No tasks yet — record a voice note and let AI build your to-do list."}

                    </span>

                  </div>

                </div>

              )}

            </div>



            {/* ------------------------------------------------
                REMINDER
            ------------------------------------------------ */}

            <div className="reminder-box">

              <p className="reminder-label">
                Detected Reminder
              </p>


              <div className="reminder-pill">

                {detectedReminder}

              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}


export default AppScreen;