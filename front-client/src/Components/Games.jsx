import { useState } from "react";
import thumbnail from "../assets/thumbnail.png";
import "./Games.css";

const games = [
  {
    id: "1",
    title: "Unity Obstacle Course",
    image: thumbnail,
    description: "This is a Unity WebGL game.",
    url: "https://play.unity.com/en/games/5d1951e3-a291-4562-ac6e-568220dc5c3f/my-fps-game", // Replace with your Unity WebGL game's URL
  },
];

const Games = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  const handleGameClick = (game) => {
    setSelectedGame(game);
  };

  const handleBackClick = () => {
    setSelectedGame(null);
  };

  return (
    <div className="games-container">
      {selectedGame ? (
        <div className="game-details">
          <button className="back-button" onClick={handleBackClick}>
            Back to Games
          </button>
          <h1>{selectedGame.title}</h1>
          <img
            src={selectedGame.image}
            alt={selectedGame.title}
            className="game-detail-image"
          />
          <p>{selectedGame.description}</p>
          <div className="game-frame">
            <iframe
              src={selectedGame.url}
              title={selectedGame.title}
              className="game-iframe"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      ) : (
        <div className="games-list">
          {games.map((game) => (
            <div
              className="game-card"
              key={game.id}
              onClick={() => handleGameClick(game)}
            >
              <img src={game.image} alt={game.title} className="game-image" />
              <h3 className="game-title">{game.title}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Games;
