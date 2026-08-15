import "./LandingPage.css";


function LandingPage({
  onStart,
  latestResult,
}) {

  // ==========================================================
  // REAL DATA
  // ==========================================================

  const transcript =
    latestResult?.transcript || "";


  const tasks =
    Array.isArray(
      latestResult?.tasks
    )
      ? latestResult.tasks
      : [];


  const reminder =
    latestResult?.reminder ||
    "";


  const firstTask =
    tasks.length > 0
      ? tasks[0]
      : null;


  // ==========================================================
  // EXPLORE WORKFLOW
  // ==========================================================

  const handleExploreWorkflow = () => {

    document
      .getElementById("workflow")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };


  // ==========================================================
  // NAVIGATION SCROLL
  // ==========================================================

  const scrollToSection = (
    id
  ) => {

    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div className="voice2task-page">

      <div className="ambient ambient-1"></div>

      <div className="ambient ambient-2"></div>

      <div className="ambient ambient-3"></div>


      <main className="container">


        {/* ==================================================
            NAVBAR
        ================================================== */}

        <header className="navbar glass">


          <button
            className="brand"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >

            <span className="brand-dot"></span>

            <span className="brand-name">
              Voice2Task
            </span>

          </button>



          <nav className="nav-links">

            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "capture"
                )
              }
            >
              Capture
            </button>


            <button
              type="button"
              onClick={
                handleExploreWorkflow
              }
            >
              Workflow
            </button>


            <button
              type="button"
              onClick={() =>
                scrollToSection(
                  "tasks"
                )
              }
            >
              Tasks
            </button>

          </nav>



          <button
            className="nav-btn"
            onClick={onStart}
          >
            Start Recording
          </button>

        </header>



        {/* ==================================================
            HERO
        ================================================== */}

        <section
          id="capture"
          className="hero-section"
        >


          {/* LEFT */}
          <div className="hero-left">

            <p className="eyebrow">
              AI VOICE PRODUCTIVITY
            </p>


            <h1 className="hero-title">

              Speak once.

              <br />

              Plan <span>everything.</span>

            </h1>


            <p className="hero-subtitle">

              Transform voice notes into
              structured tasks, reminders,
              and clear next steps with a
              premium AI workflow built for
              productivity.

            </p>


            <div className="hero-actions">

              <button
                className="primary-btn"
                onClick={onStart}
              >
                Begin Recording
              </button>


              <button
                className="secondary-btn"
                onClick={
                  handleExploreWorkflow
                }
              >
                Explore Workflow
              </button>

            </div>



            {/* =================================================
                FEATURE PILLS
            ================================================= */}

            <div
              id="workflow"
              className="feature-pills"
            >

              <div className="feature-pill glass">

                <span className="pill-label">
                  Capture
                </span>

                <strong>
                  Live voice input
                </strong>

              </div>


              <div className="feature-pill glass">

                <span className="pill-label">
                  Extract
                </span>

                <strong>
                  AI task parsing
                </strong>

              </div>


              <div className="feature-pill glass">

                <span className="pill-label">
                  Organize
                </span>

                <strong>
                  Smart to-do output
                </strong>

              </div>

            </div>

          </div>



          {/* ==================================================
              RIGHT VISUAL
          ================================================== */}

          <div className="hero-right">

            <div className="visual-card glass">

              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
                alt="Productive workspace"
              />


              <div className="image-shade"></div>


              <div className="live-chip">

                {latestResult
                  ? "LATEST SESSION"
                  : "LIVE SESSION"}

              </div>



              {/* =================================================
                  TRANSCRIPT
              ================================================= */}

              <div className="floating-card card-transcript glass">

                <span className="card-label">

                  {transcript
                    ? "Latest Transcript"
                    : "Voice Input"}

                </span>


                <p>

                  {transcript
                    ? `"${transcript}"`
                    : "Record a voice note and your real transcript will appear here."}

                </p>

              </div>



              {/* =================================================
                  TASK
              ================================================= */}

              <div className="floating-card card-task glass">

                <span className="card-label">
                  AI Extraction
                </span>


                <p>

                  {firstTask
                    ? `✓ ${firstTask.text}`
                    : "Your extracted task will appear here."}

                </p>

              </div>



              {/* =================================================
                  REMINDER
              ================================================= */}

              <div className="floating-card card-reminder glass">

                <span className="card-label">
                  Reminder
                </span>


                <p>

                  {reminder
                    ? `⏰ ${reminder}`
                    : firstTask?.time
                    ? `⏰ ${firstTask.time}`
                    : "Time detected from your voice note"}

                </p>

              </div>



              {/* RECORD ORB */}

              <div className="record-orb">

                <div className="record-ring ring-1"></div>

                <div className="record-ring ring-2"></div>

                <div className="record-core">
                  🎙️
                </div>

              </div>

            </div>

          </div>

        </section>



        {/* ==================================================
            REAL OUTPUT
        ================================================== */}

        <section
          id="tasks"
          className="bottom-strip"
        >


          {/* =================================================
              TRANSCRIPT CARD
          ================================================= */}

          <div className="bottom-card glass">

            <p className="bottom-label">
              Latest Voice Note
            </p>


            <p className="bottom-text">

              {transcript
                ? transcript
                : "Your latest voice transcript will appear here after you record and extract a voice note."}

            </p>

          </div>



          {/* =================================================
              STATS
          ================================================= */}

          <div className="bottom-card glass stats-card">

            <p className="bottom-label">
              Smart Output
            </p>


            <div className="stats-grid">


              <div className="stat-box">

                <span>
                  Tasks
                </span>

                <strong>
                  {tasks.length}
                </strong>

              </div>



              <div className="stat-box">

                <span>
                  Reminder
                </span>

                <strong>
                  {reminder
                    ? "1"
                    : "0"}
                </strong>

              </div>



              <div className="stat-box">

                <span>
                  Status
                </span>

                <strong>

                  {latestResult
                    ? "Ready"
                    : "Waiting"}

                </strong>

              </div>


            </div>

          </div>

        </section>

      </main>

    </div>
  );
}


export default LandingPage;