import videoFile from '../assets/stock_video_2.mp4';
import { useState } from 'react';
import './Home.css';

const Home = () => {
   const [imageIndex, setImageIndex] = useState(0);

   const images = [
    '/images/image1.jpg',  // Replace with your image paths
    '/images/image2.jpg',
    '/images/image3.jpg'
  ];

  const moveLeft = () => {
    setImageIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  const moveRight = () => {
    setImageIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  };

  const forumTopics = [
    "How to start learning React?",
    "Best practices for JavaScript developers",
    "CSS tricks for responsive design",
    "Understanding useState and useEffect",
    "How to deploy a React app?",
  ];

  return (
    <div className="home">
      <div className="hero-section">
        <video autoPlay muted loop playsInline className="video-background">
            <source src={videoFile} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
        <div className="hero-content">
            <h1>Welcome to My Website</h1>
        </div>
      </div>

      <div className="games-section">
        <button className="arrow left" onClick={moveLeft}>←</button>
        <div className="games-image-container">
            <img src={images[imageIndex]} alt="game" className="game-image" />
        </div>
        <button className="arrow right" onClick={moveRight}>→</button>
      </div>

      <div className='forum-section'>
        <div className='forum-image-container'> 
            <img 
                src="https://via.placeholder.com/300" 
                alt="Forum illustration" 
                className='image'
            />
        </div>
        <div className='list-container'>
            <h2>Forum Topics</h2>
            <ul className='forum-list'>
                {forumTopics.map((topic, index) => (
                    <li key={index} className='forum-list-items'>
                        {topic}
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  )
}

export default Home
