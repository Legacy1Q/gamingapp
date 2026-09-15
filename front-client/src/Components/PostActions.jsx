import { useId, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../auth/AuthContext";
import { forumRequest } from "../forum/api";

export default function PostActions({ post, kind, onChanged }) {
  const { user } = useAuth();
  const inputId = useId();
  const [mode, setMode] = useState(null);
  const [title, setTitle] = useState(post.title || "");
  const [category, setCategory] = useState(post.category || "Feedback");
  const [body, setBody] = useState(post.body);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (!user) return null;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "edit") {
        await forumRequest(`${kind === "topic" ? "topics" : "replies"}/${post.id}`, "PUT", { title, category, body });
        onChanged();
      } else {
        await forumRequest("reports", "POST", { kind, targetId: post.id, reason });
        setNotice("Report submitted to Mike for review. Thank you."); setReason("");
      }
      setMode(null);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <div className="post-actions">
    {!mode && <div className="post-action-buttons">
      {post.canEdit && <button type="button" onClick={() => { setBody(post.body); setTitle(post.title || ""); setCategory(post.category || "Feedback"); setError(""); setMode("edit"); }}>Edit {kind}</button>}
      <button type="button" onClick={() => { setError(""); setMode("report"); }}>Report {kind}</button>
    </div>}
    {mode && <form className="forum-compose" onSubmit={submit}>
      <h3>{mode === "edit" ? `Edit ${kind}` : `Report ${kind}`}</h3>
      {mode === "edit" ? <>
        {kind === "topic" && <>
          <label htmlFor={`${inputId}-title`}>Title</label><input id={`${inputId}-title`} required maxLength={120} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} />
          <label htmlFor={`${inputId}-category`}>Category</label><select id={`${inputId}-category`} disabled={busy} value={category} onChange={event => setCategory(event.target.value)}>{["Feedback", "Ideas", "Concerns"].map(value => <option key={value}>{value}</option>)}</select>
        </>}
        <label htmlFor={`${inputId}-body`}>Message</label><textarea id={`${inputId}-body`} required maxLength={4000} rows={5} value={body} disabled={busy} onChange={event => setBody(event.target.value)} />
      </> : <>
        <p>Your report is sent privately to Mike. Reporting does not automatically remove the post.</p>
        <label htmlFor={`${inputId}-reason`}>What is the concern?</label><textarea id={`${inputId}-reason`} required maxLength={1000} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.target.value)} />
      </>}
      <div className="post-action-buttons"><button disabled={busy}>{busy ? "Saving…" : mode === "edit" ? "Save changes" : "Submit report"}</button><button type="button" disabled={busy} onClick={() => { setMode(null); setError(""); }}>Cancel</button></div>
    </form>}
    {error && <p className="forum-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </div>;
}
PostActions.propTypes = { post: PropTypes.shape({ id: PropTypes.number.isRequired, title: PropTypes.string, category: PropTypes.string, body: PropTypes.string.isRequired, canEdit: PropTypes.bool }).isRequired, kind: PropTypes.oneOf(["topic", "reply"]).isRequired, onChanged: PropTypes.func.isRequired };
