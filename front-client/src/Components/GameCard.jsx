import "../styles/GameCard.css";
import PropTypes from "prop-types";

function GameCard({ game }) {
  const thumbnail =
    game.thumbnailUrl ||
    game.imageUrl ||
    game.thumbnail ||
    game.image ||
    null;

  const handlePlay = () => {
    if (!game.playUrl) return;
    window.open(game.playUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <article className="game-card">
      <div className="game-card-image-wrap">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`${game.title} thumbnail`}
            className="game-card-image"
          />
        ) : (
          <div className="game-card-placeholder">
            <span>{game.title?.charAt(0) || "G"}</span>
          </div>
        )}

        <span className="game-card-genre">{game.genre || "Game"}</span>
      </div>

      <div className="game-card-body">
        <div className="game-card-header">
          <h2>{game.title}</h2>
          {game.developerName && <p>by {game.developerName}</p>}
        </div>

        <p className="game-card-description">
          {game.description || "No description available yet."}
        </p>

        <button
          type="button"
          className="game-card-play-button"
          onClick={handlePlay}
          disabled={!game.playUrl}
        >
          {game.playUrl ? "Play Now" : "Coming Soon"}
        </button>
      </div>
    </article>
  );
}

GameCard.propTypes = {
  game: PropTypes.shape({
    title: PropTypes.string.isRequired,
    genre: PropTypes.string,
    description: PropTypes.string,
    developerName: PropTypes.string,
    playUrl: PropTypes.string,
    thumbnailUrl: PropTypes.string,
    imageUrl: PropTypes.string,
    thumbnail: PropTypes.string,
    image: PropTypes.string,
  }).isRequired,
};

export default GameCard;
