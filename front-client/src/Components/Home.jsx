import { useEffect, useState } from "react";
import videoFile from "../assets/stock_video_2.mp4";
import thumbnail2 from "../assets/thumbnail2.png";
import { Link } from "react-router-dom";
import { forumRequest } from "../forum/api";
import "../styles/Home.css";

const featuredGames = [
  {
    title: "Z-Dasher",
    image: thumbnail2,
    description: "Delivery Zombie Survival Game.",
  },
];

const Home = () => {
  const [forumTopics, setForumTopics] = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [topicsError, setTopicsError] = useState("");

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
    </div>
  );
};

export default Home;
