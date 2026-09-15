import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { forumRequest } from "../forum/api";
import "../styles/Community.css";

export default function Community() {
  const { id } = useParams();
  const { user, loading: sessionLoading } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Feedback");
  const [body, setBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const returnTo = id ? `/community/${id}` : "/community";

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    forumRequest(`topics${id ? `/${id}` : ""}?page=${page}`).then(value => {
      if (active) setData(value);
    }).catch(failure => { if (active) setLoadError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, page, revision, user]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (id) {
        await forumRequest(`topics/${id}/replies`, "POST", { body });
        setBody("");
        setPage(Math.floor((data?.total || 0) / 20) + 1);
        setRevision(value => value + 1);
      } else {
        const topic = await forumRequest("topics", "POST", { title, category, body });
        navigate(`/community/${topic.id}`);
      }
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function deleteTopic() {
    setBusy(true);
    setError("");
    try { await forumRequest(`topics/${id}`, "DELETE"); navigate("/community"); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <div className="community-page"><div className="community-content">
    {id && <Link to="/community">← All discussions</Link>}
    <h1>{id ? "Discussion" : "Community"}</h1>
    {!id && <p>Share feedback, suggest ideas, and raise concerns about the games you play.</p>}
    {loading ? <p role="status">Loading discussions…</p> : loadError ? <div role="alert"><p>{loadError}</p><button onClick={() => setRevision(value => value + 1)}>Try again</button></div> : data && <>
      {id ? <>
        <article className="forum-post">
          <span className="forum-category">{data.category}</span>
          <h2>{data.title}</h2>
          <p className="forum-meta">{data.author} · {new Date(data.createdAt).toLocaleString()}</p>
          <p className="forum-body">{data.body}</p>
          {data.canDelete && <div className="forum-delete">
            {confirmDelete ? <><p>Delete this topic and all its replies?</p><button disabled={busy} onClick={deleteTopic}>Delete topic</button> <button disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button></>
              : <button onClick={() => setConfirmDelete(true)}>Delete topic</button>}
          </div>}
        </article>
        <h2>Replies ({data.total})</h2>
        {data.replies.length === 0 && <p>No replies yet. Start the conversation.</p>}
        {data.replies.map(reply => <article className="forum-post" key={reply.id}>
          <p className="forum-meta">{reply.author} · {new Date(reply.createdAt).toLocaleString()}</p>
          <p className="forum-body">{reply.body}</p>
        </article>)}
      </> : <div className="forum-topics">
        {data.items.length === 0 && <p>No discussions yet. Be the first to share your thoughts.</p>}
        {data.items.map(topic => <article className="forum-post" key={topic.id}>
          <span className="forum-category">{topic.category}</span>
          <h2><Link to={`/community/${topic.id}`}>{topic.title}</Link></h2>
          <p className="forum-meta">{topic.author} · {new Date(topic.createdAt).toLocaleDateString()} · {topic.replyCount} replies</p>
        </article>)}
      </div>}
      {data.total > 20 && <nav className="forum-pagination" aria-label="Discussion pages">
        <button disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page}</span><button disabled={page * 20 >= data.total} onClick={() => setPage(value => value + 1)}>Next</button>
      </nav>}
    </>}
    {error && <p className="forum-error" role="alert">{error}</p>}
    {!sessionLoading && (!id || (!loading && !loadError)) && (user ? <form className="forum-compose" onSubmit={submit}>
      <h2>{id ? "Leave a reply" : "Start a discussion"}</h2>
      <p>Be respectful. Posts are public; avoid sharing personal contact details.</p>
      {!id && <>
        <label htmlFor="forum-category">Category</label>
        <select id="forum-category" value={category} onChange={event => setCategory(event.target.value)} disabled={busy}>
          {["Feedback", "Ideas", "Concerns"].map(value => <option key={value}>{value}</option>)}
        </select>
        <label htmlFor="forum-title">Title</label>
        <input id="forum-title" value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} disabled={busy} />
      </>}
      <label htmlFor="forum-body">{id ? "Reply" : "Message"}</label>
      <textarea id="forum-body" value={body} onChange={event => setBody(event.target.value)} required maxLength={4000} rows={6} disabled={busy} />
      <button disabled={busy}>{busy ? "Saving…" : id ? "Post reply" : "Post topic"}</button>
    </form> : <p className="forum-compose"><Link to="/login" state={{ returnTo }}>Log in</Link> to join the discussion.</p>)}
  </div></div>;
}
