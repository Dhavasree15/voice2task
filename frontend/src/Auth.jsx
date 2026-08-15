import { useState } from "react";
import { supabase } from "./supabaseClient";
import "./auth.css";
function Auth() {
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isLogin) {
        // -----------------------------
        // LOGIN
        // -----------------------------
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        // App.jsx listens to the Supabase
        // authentication state automatically.
      } else {
        // -----------------------------
        // SIGN UP
        // -----------------------------
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          throw error;
        }

        // If email confirmation is disabled,
        // Supabase may create a session immediately.
        if (data.session) {
          setMessage("Account created successfully.");
        } else {
          setMessage(
            "Account created! Please check your email and confirm your account before logging in."
          );
        }
      }
    } catch (error) {
      setError(error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode() {
    setIsLogin((previous) => !previous);
    setEmail("");
    setPassword("");
    setError("");
    setMessage("");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span className="auth-logo-dot"></span>
          <span>Voice2Task</span>
        </div>

        <h1>
          {isLogin ? "Welcome back." : "Create your account."}
        </h1>

        <p className="auth-subtitle">
          {isLogin
            ? "Turn your thoughts into tasks instantly."
            : "Start turning your voice into organized tasks."}
        </p>

        <form onSubmit={handleSubmit}>

          <div className="auth-field">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Minimum 6 characters"
              autoComplete={
                isLogin ? "current-password" : "new-password"
              }
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {message && (
            <div className="auth-message">
              {message}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>

        </form>

        <div className="auth-switch">
          <span>
            {isLogin
              ? "Don't have an account?"
              : "Already have an account?"}
          </span>

          <button
            type="button"
            onClick={switchMode}
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </div>

      </div>
    </div>
  );
}

export default Auth;