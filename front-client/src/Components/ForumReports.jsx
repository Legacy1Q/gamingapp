import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { forumRequest } from "../forum/api";
import "../styles/Community.css";

export default function ForumReports() {
  const { user, loading: sessionLoading } = useAuth();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    if (!user?.isOwner) return;
    let active = true;
    setLoading(true); setError("");
    forumRequest(`reports?page=${page}`).then(value => { if (active) setData(value); })
      .catch(failure => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, user]);

  async function resolve(id, action) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await forumRequest(`reports/${id}/resolve`, "POST", { action });
      setConfirmation(null); setPage(1); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <div className="community-page"><div className="community-content">
    <Link to="/community">← Community</Link><h1>Reported posts</h1>
    {sessionLoading ? <p role="status">Checking access…</p> : !user?.isOwner ? <p>This page is available to the site owner only.</p> : <>
      <p>Review the saved report and inspect the current discussion before deciding.</p>
      {error && <div role="alert"><p className="forum-error">{error}</p><button onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
      {loading ? <p role="status">Loading reports…</p> : data && <>
        <p>{data.total} open reports</p>
        {data.items.map(report => <article className="forum-post" key={report.id}>
          <h2>{report.titleSnapshot}</h2><p className="forum-meta">Reported {report.kind} · {new Date(report.createdAt).toLocaleString()}</p>
          <h3>Reason</h3><p className="forum-body">{report.reason}</p>
          <h3>Text when reported</h3><blockquote className="forum-body">{report.bodySnapshot}</blockquote>
          <Link to={`/community/${report.topicId}`}>View discussion</Link>
          {confirmation === report.id ? <div><p>Remove this {report.kind}? Removing a topic also deletes its replies. If it is already gone, this closes the report.</p><button disabled={busy} onClick={() => resolve(report.id, "remove")}>Confirm removal</button> <button disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button></div>
            : <div className="post-action-buttons"><button disabled={busy} onClick={() => resolve(report.id, "dismiss")}>Dismiss report</button><button disabled={busy} onClick={() => setConfirmation(report.id)}>Remove {report.kind}</button></div>}
        </article>)}
        {data.total > 20 && <nav className="forum-pagination" aria-label="Report pages"><button disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= data.total || busy} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
      </>}
    </>}
  </div></div>;
}
