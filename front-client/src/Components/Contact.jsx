import "../styles/About.css";

export default function Contact() {
  return (
    <article className="about-page">
      <div className="about-content">
        <p className="about-label">Get in touch</p>
        <h1>Contact Mike Sims</h1>
        <p className="about-intro">Questions about my games or interested in connecting?</p>
        <dl className="contact-links">
          <div>
            <dt>Email</dt>
            <dd><a href="mailto:mdsims2@outlook.com">mdsims2@outlook.com</a></dd>
          </div>
          <div>
            <dt>LinkedIn</dt>
            <dd><a href="https://www.linkedin.com/in/mikesimsii" target="_blank" rel="noopener noreferrer">Mike Sims on LinkedIn (opens in a new tab)</a></dd>
          </div>
          <div>
            <dt>GitHub</dt>
            <dd><a href="https://github.com/Legacy1Q" target="_blank" rel="noopener noreferrer">Legacy1Q on GitHub (opens in a new tab)</a></dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
