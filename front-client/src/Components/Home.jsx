import videoFile from "../assets/stock_video_2.mp4";
<<<<<<< HEAD
import thumbnail2 from "../assets/thumbnail2.png";
import { Link } from "react-router-dom";
=======
import thumbnail from "../assets/thumbnail.png";
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
import "../styles/Home.css";

const featuredGames = [
  {
<<<<<<< HEAD
    title: "Z-Dasher",
    image: thumbnail2,
    description: "Delivery Zombie Survival Game.",
=======
    title: "Unity Obstacle Course",
    image: thumbnail,
    description: "Run, dodge, and survive your first hosted Unity game.",
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
  },
];

const forumTopics = [
  "Share your highest scores",
  "Suggest new game ideas",
  "Report bugs and feedback",
  "Behind-the-scenes dev updates",
];

const Home = () => {
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
<<<<<<< HEAD

            <Link key={game.title} to="/games" className="featured-card-link"> 
            
=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
            <article className="featured-card" key={game.title}>
              <img src={game.image} alt={game.title} />
              <div>
                <h3>{game.title}</h3>
                <p>{game.description}</p>
              </div>
            </article>
<<<<<<< HEAD
            </Link>
=======
>>>>>>> 2ce1f479654d3d0c709476dcf80cf8cbc72405ee
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
          <ul className="forum-list">
            {forumTopics.map((topic) => (
              <li key={topic} className="forum-list-items">{topic}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default Home;
