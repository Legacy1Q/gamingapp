import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "../styles/Account.css";

export default function Profile() {
  const { user, loading, sessionError, saveProfile } = useAuth();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  if (loading) return <div className="account-page" role="status">Loading profile…</div>;
  if (!user) return <Navigate to="/login" state={{ returnTo: "/profile" }} replace />;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setSaved(false);
    try {
      await saveProfile((draft ?? (user.hasDisplayName ? user.displayName : "")).trim());
      setDraft(null); setSaved(true);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <div className="account-page"><section className="account-panel" aria-labelledby="profile-title">
    <h1 id="profile-title">Your profile</h1>
    <p>Choose the public name players see beside your topics and replies.</p>
    <p className="account-help">Current public name: <strong>{user.displayName}</strong></p>
    <p className="account-help">Sign-in email (private): {user.email}</p>
    {(error || sessionError) && <p className="account-error" role="alert">{error || sessionError}</p>}
    {saved && <p className="account-success" role="status">Display name saved. Your existing posts now use this name too.</p>}
    <form onSubmit={submit} aria-busy={busy}>
      <label htmlFor="display-name">Display name</label>
      <input id="display-name" autoComplete="nickname" required minLength={3} maxLength={30}
        value={draft ?? (user.hasDisplayName ? user.displayName : "")}
        onChange={event => { setDraft(event.target.value); setSaved(false); }} disabled={busy} aria-describedby="display-name-help" />
      <p id="display-name-help" className="account-help">3–30 letters (A–Z), numbers, spaces, underscores or hyphens. Names must be unique, regardless of capitalization. Don’t use your email address.</p>
      <button disabled={busy}>{busy ? "Saving…" : "Save display name"}</button>
    </form>
  </section></div>;
}
