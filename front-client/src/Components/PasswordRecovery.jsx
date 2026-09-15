import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { submitAccountAction } from "../auth/api";
import { useAuth } from "../auth/AuthContext";
import "../styles/Account.css";

export default function PasswordRecovery({ reset = false }) {
  const { clearSession } = useAuth();
  const [link, setLink] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return { userId: params.get("userId"), token: params.get("token") };
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    // The fragment keeps reset credentials out of HTTP logs. Remove it from the address bar too.
    if (reset && window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [reset]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (reset && password !== confirmation) { setError("Your passwords do not match."); return; }
    setBusy(true);
    try {
      if (reset) {
        await submitAccountAction("reset-password", { ...link, password });
        clearSession(); setLink({});
      } else await submitAccountAction("forgot-password", { email: email.trim() });
      setDone(true);
    } catch (failure) { setError(failure.message); }
    finally { setPassword(""); setConfirmation(""); setBusy(false); }
  }

  return <div className="account-page"><section className="account-panel" aria-labelledby="recovery-title">
    <h1 id="recovery-title">{reset ? "Reset your password" : "Forgot your password?"}</h1>
    {done ? <p className="account-success" role="status">{reset ? "Password updated. Log in with your new password." : "If an account matches that email, you’ll receive a password reset link. Check your inbox and spam folder."}</p>
      : reset && (!link.userId || !link.token) ? <p role="alert">This link is incomplete. Request a new password reset link.</p>
      : <form onSubmit={submit} aria-busy={busy}>
        {reset ? <>
          <label htmlFor="new-password">New password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} aria-describedby="recovery-help" />
          <p id="recovery-help" className="account-help">10–128 characters, including uppercase and lowercase letters, a number, and a symbol.</p>
          <label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" required maxLength={128} value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} />
        </> : <>
          <p>Enter the email address you used to create your account.</p>
          <label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" required maxLength={256} value={email} disabled={busy} onChange={event => setEmail(event.target.value)} />
        </>}
        <button disabled={busy}>{busy ? "Please wait…" : reset ? "Reset password" : "Send reset link"}</button>
      </form>}
    {error && <p className="account-error" role="alert">{error}</p>}
    <p className="account-switch"><Link to="/login">Back to login</Link></p>
    {reset && !done && <p><Link to="/forgot-password">Request a new reset link</Link></p>}
  </section></div>;
}
PasswordRecovery.propTypes = { reset: PropTypes.bool };
