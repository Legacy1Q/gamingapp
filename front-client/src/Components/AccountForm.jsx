import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../auth/AuthContext";
import { submitAccountAction } from "../auth/api";
import "../styles/Account.css";

export default function AccountForm({ register = false }) {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Only return to known local pages; never redirect to an arbitrary URL.
  const requestedReturn = location.state?.returnTo;
  const returnTo = typeof requestedReturn === "string" && /^(\/leaderboard|\/profile|\/games\/z-dasher|\/community(?:\/\d+)?)$/.test(requestedReturn) ? requestedReturn : "/games";

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (register && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const credentials = { email: email.trim(), password };
      if (register) {
        await submitAccountAction("register", credentials);
        navigate("/login", { replace: true, state: { registered: true, returnTo } });
      } else {
        await login(credentials);
        navigate(returnTo, { replace: true });
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPassword("");
      setConfirmation("");
      setBusy(false);
    }
  }

  if (loading) return <div className="account-page" role="status">Checking your session…</div>;
  if (user) return <Navigate to={returnTo} replace />;

  return (
    <div className="account-page">
      <section className="account-panel" aria-labelledby="account-title">
        <h1 id="account-title">{register ? "Create your account" : "Welcome back"}</h1>
        <p>{register ? "Join Mike’s game community." : "Log in to your GameHub account."}</p>
        {!register && location.state?.registered && <p className="account-success" role="status">Account created. You can now log in.</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="account-email">Email</label>
          <input id="account-email" type="email" autoComplete="username" maxLength={256} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} />
          <label htmlFor="account-password">Password</label>
          <input id="account-password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={register ? 10 : undefined} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} aria-describedby={register ? "password-help" : undefined} />
          {register && <>
            <p id="password-help" className="account-help">Use 10–128 characters, including uppercase and lowercase letters, a number, and a symbol.</p>
            <label htmlFor="account-confirm">Confirm password</label>
            <input id="account-confirm" type="password" autoComplete="new-password" maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} />
          </>}
          <button type="submit" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Log in"}</button>
        </form>
        {!register && <p className="account-switch"><Link to="/forgot-password">Forgot password?</Link></p>}
        <p className="account-switch">{register ? "Already have an account? " : "New here? "}<Link to={register ? "/login" : "/register"} state={{ returnTo }}>{register ? "Log in" : "Create an account"}</Link></p>
      </section>
    </div>
  );
}

AccountForm.propTypes = { register: PropTypes.bool };


