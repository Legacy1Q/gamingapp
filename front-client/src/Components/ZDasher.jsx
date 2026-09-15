import { Link } from "react-router-dom";
import thumbnail from "../assets/thumbnail2.png";
import "../styles/ZDasher.css";
import PlayLink from "./PlayLink";
import GameReviews from "./GameReviews";

// .NET serves everything inside wwwroot at the server's root URL.
// Override this address with VITE_API_BASE_URL when hosting the app elsewhere.
const backendUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5004";
const playUrl = new URL("/games/z-dasher/index.html", backendUrl).href;

export default function ZDasher() {
  return (
    <article className="z-dasher">
      <div className="z-dasher-content">
        <Link className="z-dasher-back" to="/games">← Back to games</Link>
        <div className="z-dasher-layout">
          <img className="z-dasher-art" src={thumbnail} alt="Z-Dasher game artwork" />
          <div className="z-dasher-copy">
            <p className="z-dasher-label">Zombie survival · Browser game</p>
            <h1>Z-Dasher</h1>
            <p className="z-dasher-description">A delivery zombie survival game.</p>
            <PlayLink className="z-dasher-play" playUrl={playUrl}>
              Play Z-Dasher
            </PlayLink>
            <p><Link to="/leaderboard" style={{ color: "#6fffe9" }}>View fastest finishes</Link></p>
            <p className="z-dasher-note">Opens in a new tab. The first load may take a moment while the game downloads.</p>
            <section className="z-dasher-about" aria-labelledby="z-dasher-about-title">
              <h2 id="z-dasher-about-title">About the game</h2>
              <p>Drive to restaurants, pick up food deliveries, and deliver them to designated houses while avoiding the zombie horde.</p>
            </section>
            <section className="z-dasher-about" aria-labelledby="z-dasher-how-to-play-title">
              <h2 id="z-dasher-how-to-play-title">How to play</h2>
              <p className="z-dasher-controls">
                Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> to move.
              </p>
              <dl className="z-dasher-pickups">
                <div>
                  <dt className="z-dasher-health">Green health packs</dt>
                  <dd>Collect them around the map to restore your health.</dd>
                </div>
                <div>
                  <dt className="z-dasher-speed">Blue batteries</dt>
                  <dd>Collect them to move faster.</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
        <GameReviews />
      </div>
    </article>
  );
}
