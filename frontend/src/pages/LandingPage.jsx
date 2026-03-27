import "./LandingPage.css";

function LandingPage({ onStart }) {
  return (
    <div className="voice2task-page">
      <div className="ambient ambient-1"></div>
      <div className="ambient ambient-2"></div>
      <div className="ambient ambient-3"></div>

      <main className="container">
        <header className="navbar glass">
          <div className="brand">
            <span className="brand-dot"></span>
            <span className="brand-name">Voice2Task</span>
          </div>

          <nav className="nav-links">
            <a href="/">Capture</a>
            <a href="/">Workflow</a>
            <a href="/">Tasks</a>
          </nav>

          <button className="nav-btn" onClick={onStart}>
            Start Recording
          </button>
        </header>

        <section className="hero-section">
          <div className="hero-left">
            <p className="eyebrow">AI VOICE PRODUCTIVITY</p>

            <h1 className="hero-title">
              Speak once.
              <br />
              Plan <span>everything.</span>
            </h1>

            <p className="hero-subtitle">
              Transform voice notes into structured tasks, reminders, and clear
              next steps with a premium AI workflow built for productivity.
            </p>

            <div className="hero-actions">
              <button className="primary-btn" onClick={onStart}>
                Begin Recording
              </button>
              <button className="secondary-btn">Explore Workflow</button>
            </div>

            <div className="feature-pills">
              <div className="feature-pill glass">
                <span className="pill-label">Capture</span>
                <strong>Live voice input</strong>
              </div>

              <div className="feature-pill glass">
                <span className="pill-label">Extract</span>
                <strong>AI task parsing</strong>
              </div>

              <div className="feature-pill glass">
                <span className="pill-label">Organize</span>
                <strong>Smart to-do output</strong>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="visual-card glass">
              <img
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
                alt="Productive workspace"
              />

              <div className="image-shade"></div>

              <div className="live-chip">LIVE SESSION</div>

              <div className="floating-card card-transcript glass">
                <span className="card-label">Transcript</span>
                <p>“Tomorrow call mentor at 5 PM...”</p>
              </div>

              <div className="floating-card card-task glass">
                <span className="card-label">Task Created</span>
                <p>✓ Call mentor</p>
              </div>

              <div className="floating-card card-reminder glass">
                <span className="card-label">Reminder</span>
                <p>5 PM</p>
              </div>

              <div className="record-orb">
                <div className="record-ring ring-1"></div>
                <div className="record-ring ring-2"></div>
                <div className="record-core">🎙️</div>
              </div>
            </div>
          </div>
        </section>

        <section className="bottom-strip">
          <div className="bottom-card glass">
            <p className="bottom-label">Voice Note Preview</p>
            <p className="bottom-text">
              Tomorrow call mentor at 5 PM, finish PPT deck, and submit project
              report before evening.
            </p>
          </div>

          <div className="bottom-card glass stats-card">
            <p className="bottom-label">Smart Output</p>

            <div className="stats-grid">
              <div className="stat-box">
                <span>Tasks</span>
                <strong>3</strong>
              </div>

              <div className="stat-box">
                <span>Reminder</span>
                <strong>1</strong>
              </div>

              <div className="stat-box">
                <span>Status</span>
                <strong>Ready</strong>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;