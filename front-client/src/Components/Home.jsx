import { useEffect, useState } from "react";
import videoFile from "../assets/stock_video_2.mp4";
import thumbnail2 from "../assets/thumbnail2.png";
import { Link } from "react-router-dom";
import { forumRequest } from "../forum/api";
import { useAuth } from "../auth/AuthContext";
import "../styles/Home.css";

const featuredGames = [
  {
    title: "Z-Dasher",
    image: thumbnail2,
    description: "Delivery Zombie Survival Game.",
  },
];

const Home = () => {
  const { user, loading: sessionLoading } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [rankingsLoading, setRankingsLoading] = useState(true);
  const [rankingsError, setRankingsError] = useState("");
  const [forumTopics, setForumTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    setRankingsLoading(true);
    setRankingsError("");
    async function loadRankings() {
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
      const response = await fetch(new URL("/leaderboards/z-dasher?page=1", base), {
        credentials: "include", cache: "no-store",
      });
      if (!response.ok) throw new Error(response.status === 401
        ? "Please log in again to view player rankings."
        : "Unable to load rankings. Try the full leaderboard.");
      const data = await response.json();
      if (active) setRankings(data.items.slice(0, 5));
    }
    loadRankings().catch(() => {
      if (active) setRankingsError("Unable to load rankings. Try the full leaderboard.");
    }).finally(() => {
      if (active) setRankingsLoading(false);
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    let active = true;
    setTopicsLoading(true);
    setTopicsError("");
    forumRequest("topics?page=1").then((data) => {
      if (!active) return;
      setForumTopics(Array.isArray(data?.items) ? data.items.slice(0, 4) : []);
    }).catch((failure) => {
      if (active) setTopicsError(failure.message);
    }).finally(() => {
      if (active) setTopicsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="home">
      <section className="hero-section">
        <video autoPlay muted loop playsInline className="video-background">
          <source src={videoFile} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="hero-overlay" />

        <div className="hero-content">
          <p className="eyebrow">Indie Games • Community • Updates</p>
          <h1>Welcome to GameHub</h1>
          <p className="hero-subtitle">
            A home for the games you create, launch, and share with players.
          </p>
          <a href="/games" className="hero-button">Browse Games</a>
        </div>
      </section>

      <section className="games-section">
        <div className="section-copy">
          <p className="eyebrow">Featured</p>
          <h2>Latest Game</h2>
          <p>Start with one strong playable game, then grow the library over time.</p>
        </div>

        <div className="featured-grid">
          {featuredGames.map((game) => (
            <Link key={game.title} to="/games/z-dasher" className="featured-card-link"> 
            <article className="featured-card" key={game.title}>
              <img src={game.image} alt={game.title} />
              <div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
              </div>
            </article>
            </Link>
          ))}
        </div>
      </section>

      <section className="forum-section">
        <div className="forum-image-container">
          <div className="community-card">
            <span>GG</span>
          </div>
        </div>

        <div className="list-container">
          <p className="eyebrow">Community</p>
          <h2>Forum Topics</h2>
          <Link to="/community" className="hero-button">Join the discussion</Link>
          <ul className="forum-list">
            {topicsLoading ? (
              <li className="forum-list-items forum-list-status">Loading the latest discussions…</li>
            ) : topicsError ? (
              <li className="forum-list-items forum-list-status">
                <span>{topicsError}</span>
                <Link to="/community" className="forum-topic-link">Open the community page</Link>
              </li>
            ) : forumTopics.length === 0 ? (
              <li className="forum-list-items forum-list-status">
                <span>No discussions yet. Start the first topic in the community forum.</span>
                <Link to="/community" className="forum-topic-link">Start a discussion</Link>
              </li>
            ) : (
              forumTopics.map((topic) => (
                <li key={topic.id} className="forum-list-items">
                  <Link to={`/community/${topic.id}`} className="forum-topic-link">
                    <span className="forum-topic-category">{topic.category}</span>
                    <strong>{topic.title}</strong>
                    <span className="forum-topic-meta">
                      {topic.author} · {topic.replyCount} {topic.replyCount === 1 ? "reply" : "replies"}
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
      <section className="home-leaderboard-section" aria-labelledby="home-leaderboard-title">
        <div className="section-copy">
          <p className="eyebrow">Z-Dasher · Top players</p>
          <h2 id="home-leaderboard-title">Leaderboard</h2>
          <p>Five deliveries. One life. Race for the top spot.</p>
          <Link to="/leaderboard" className="hero-button">View full leaderboard</Link>
        </div>
        <div className="home-leaderboard-card">
          {sessionLoading ? <p role="status">Checking session…</p>
            : !user ? <p><Link to="/login" state={{ returnTo: "/" }}>Log in</Link> to see player rankings.</p>
            : rankingsLoading ? <p role="status">Loading rankings…</p>
            : rankingsError ? <p role="alert">{rankingsError}</p>
            : rankings.length === 0 ? <p>No qualifying finishes yet. Be the first to claim a rank!</p>
            : <table aria-label="Top five Z-Dasher players">
              <thead><tr><th scope="col">Rank</th><th scope="col">Name</th></tr></thead>
              <tbody>{rankings.map((player, index) => <tr key={index}>
                <td>#{player.rank}</td><th scope="row">{player.name}</th>
              </tr>)}</tbody>
            </table>}
        </div>
      </section>
    </div>
  );
};

export default Home;
