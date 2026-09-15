import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { reviewRequest } from "../reviews/api";
import "../styles/Reviews.css";

export default function GameReviews() {
  const { user, loading: sessionLoading } = useAuth();
  const [gameId, setGameId] = useState(null);
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError(""); setDraft(null); setConfirmDelete(false);
    async function load() {
      const games = await reviewRequest("/games");
      const game = games.find(item => item.title.toLowerCase().replace(/[^a-z0-9]/g, "") === "zdasher");
      if (!game) throw new Error("Reviews will be available when Z-Dasher is listed in the library.");
      const result = await reviewRequest(`/reviews/${game.id}?page=${page}`);
      if (active) { setGameId(game.id); setData(result); }
    }
    load().catch(failure => { if (active) setLoadError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, revision, user]);

  const form = draft ?? data?.myReview ?? { rating: 0, body: "" };
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await reviewRequest(`/reviews/${gameId}/mine`, "PUT", form);
      setNotice("Your review has been saved."); setPage(1); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(""); setNotice("");
    try {
      await reviewRequest(`/reviews/${gameId}/mine`, "DELETE");
      setNotice("Your review has been deleted."); setPage(1); setRevision(value => value + 1);
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  return <section className="game-reviews" aria-labelledby="reviews-heading">
    <h2 id="reviews-heading">Player reviews</h2>
    {loading ? <p role="status">Loading reviews…</p> : loadError ? <div role="alert"><p>{loadError}</p><button onClick={() => setRevision(value => value + 1)}>Try again</button></div> : data && <>
      <p className="review-summary">{data.count ? `${data.average.toFixed(1)} / 5 · ${data.count} ${data.count === 1 ? "review" : "reviews"}` : "No reviews yet. Share your experience with Z-Dasher."}</p>
      {!sessionLoading && (user ? <form className="review-form" onSubmit={save}>
        <h3>{data.myReview ? "Edit your review" : "Write a review"}</h3>
        <p>One review per player. You can update yours anytime.</p>
        <fieldset disabled={busy}>
          <legend>Your rating</legend>
          <div className="rating-options">{[1, 2, 3, 4, 5].map(value => <label key={value}>
            <input type="radio" name="rating" value={value} required checked={Number(form.rating) === value}
              onChange={() => setDraft({ ...form, rating: value })} /> {value} <span aria-hidden="true">★</span><span className="rating-sr">{value === 1 ? " star" : " stars"}</span>
          </label>)}</div>
          <label htmlFor="review-body">Your experience</label>
          <textarea id="review-body" required maxLength={2000} rows={5} value={form.body}
            onChange={event => setDraft({ ...form, body: event.target.value })} aria-describedby="review-help" />
          <p id="review-help">Up to 2,000 characters. Your display name will appear publicly.</p>
          <button type="submit">{busy ? "Saving…" : data.myReview ? "Save changes" : "Post review"}</button>
        </fieldset>
        {data.myReview && <div className="review-delete">{confirmDelete ? <><p>Delete your review?</p><button type="button" disabled={busy} onClick={remove}>Delete review</button> <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button></>
          : <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete my review</button>}</div>}
      </form> : <p><Link to="/login" state={{ returnTo: "/games/z-dasher" }}>Log in</Link> to write a review.</p>)}
      {data.items.map(review => <article className="review-item" key={review.id}>
        <h3>{review.author}</h3>
        <p className="review-rating" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
        <p className="review-date">{new Date(review.createdAt).toLocaleDateString()}{review.updatedAt ? " · Edited" : ""}</p>
        <p className="review-body">{review.body}</p>
      </article>)}
      {data.count > 10 && <nav className="review-pages" aria-label="Review pages"><button disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 10 >= data.count || busy} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
    </>}
    {error && <p className="review-error" role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
