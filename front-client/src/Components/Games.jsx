import { useState } from "react";
import thumbnail from "../assets/thumbnail.png";
import "./Games.css";

const games = [
  {
    id: "1",
    title: "Obstacle Course",
    image: thumbnail,
    description: "This is the first game.",
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
