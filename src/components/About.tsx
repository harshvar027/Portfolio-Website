import "./styles/About.css";

const About = () => {
  return (
    <div className="about-section" id="about">
      <div className="about-me">
        <h3 className="title">About Me</h3>
        <p className="para about-text">
          I am{" "}
          <span className="about-highlight">Harshvardhan Singh</span>, currently
          pursuing a{" "}
          <span className="about-highlight">
            Bachelor of Technology (B.Tech)
          </span>{" "}
          degree. I have over{" "}
          <span className="about-highlight">5 years of experience</span> working
          with various technologies and modern development tools.
        </p>
        <p className="para about-text about-text-secondary">
          Throughout my journey, I have built and developed numerous websites,
          gaining hands-on expertise in web development, database management,
          API integration, and creating user-friendly digital experiences. I am
          passionate about technology, problem-solving, and continuously
          learning new skills to build innovative and impactful solutions.
        </p>
      </div>
    </div>
  );
};

export default About;
