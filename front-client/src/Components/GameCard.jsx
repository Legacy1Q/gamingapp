import "../styles/GameCard.css";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import zDasherArtwork from "../assets/thumbnail2.png";
import PlayLink from "./PlayLink";

function GameCard({ game }) {
  const isZDasher = game.title?.toLowerCase().replace(/[^a-z0-9]/g, "") === "zdasher";
  const thumbnail =
    game.thumbnailUrl ||
    game.imageUrl ||
    game.thumbnail ||
    game.image ||
    (isZDasher ? zDasherArtwork : null);

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

      </div>

      <div className="game-card-body">
        <span className="game-card-genre">{game.genre || "Game"}</span>
        <div className="game-card-header">
          <h2>{isZDasher ? (
            <Link to="/games/z-dasher" style={{ color: "inherit" }}>{game.title}</Link>
          ) : game.title}</h2>
          {game.developerName && <p>by {game.developerName}</p>}
        </div>

        <p className="game-card-description">
          {game.description || "No description available yet."}
        </p>

        <div className="game-card-actions">
        <PlayLink
          className="game-card-play-button"
          playUrl={game.playUrl}
        >
          {game.playUrl ? "Play Now" : "Coming Soon"}
        </PlayLink>
        {isZDasher && <Link className="game-card-details" to="/games/z-dasher">About the game</Link>}
        </div>
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
