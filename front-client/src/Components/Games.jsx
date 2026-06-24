import { useState } from "react";
import thumbnail from "../assets/thumbnail.png";
import "../styles/Games.css";

const games = [
  {
    id: "1",
    title: "Unity Obstacle Course",
    image: thumbnail,
    description: "A playable Unity WebGL obstacle course hosted through Unity Play.",
    url: "https://play.unity.com/en/games/5d1951e3-a291-4562-ac6e-568220dc5c3f/my-fps-game",
  },
];

const Games = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  if (selectedGame) {
    return (
      <section className="games-container">
        <button className="back-button" onClick={() => setSelectedGame(null)}>
          ← Back to Games
        </button>

        <div className="game-details">
          <h1>{selectedGame.title}</h1>
          <p>{selectedGame.description}</p>

          <div className="game-frame">
            <iframe
              src={selectedGame.url}
              title={selectedGame.title}
              className="game-iframe"
              allow="fullscreen; autoplay; gamepad"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="games-container">
      <div className="games-header">
        <p className="eyebrow">Play Now</p>
        <h1>Featured Games</h1>
        <p>Choose a game and launch it directly from the app.</p>
      </div>

      <div className="games-list">
        {games.map((game) => (
          <button
            type="button"
            className="game-card"
            key={game.id}
            onClick={() => setSelectedGame(game)}
          >
            <img src={game.image} alt={game.title} className="game-card-image" />
            <div className="game-card-body">
              <h3 className="game-title">{game.title}</h3>
              <p>{game.description}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default Games;
