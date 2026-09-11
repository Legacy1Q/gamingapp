import "../styles/About.css";

export default function About() {
  return (
    <article className="about-page">
      <div className="about-content">
        <p className="about-label">About me</p>
        <h1>Hi, I’m Mike Sims.</h1>
        <p className="about-intro">
          I’m a beginner indie game developer and a self-taught software
          developer working with C# and .NET.
        </p>

        <section className="about-section" aria-labelledby="about-start">
          <h2 id="about-start">From playing games to making them</h2>
          <p>
            My passion for video games sparked my interest in programming.
            Now I’m learning how to turn that passion into games of my own.
          </p>
        </section>

        <section className="about-section" aria-labelledby="about-project">
          <h2 id="about-project">Why I built this site</h2>
          <p>
            I created this app to put my C# knowledge into practice, expand my
            understanding of full-stack development, and showcase my interest
            in game development. It’s a place to share the games I create as
            I continue learning.
          </p>
        </section>
      </div>
    </article>
  );
}
