import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My journey <span>&</span>
          <br /> learning path
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Class 8 Complete</h4>
                <h5>CS & Full Stack Foundations</h5>
              </div>
              <h3>2022</h3>
            </div>
            <p>
              Completed Class 8 and started learning about computer science and
              full stack development architecture — exploring React, Java, and
              the fundamentals of modern web development.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Class 10 Passed</h4>
                <h5>Frontend Mastery</h5>
              </div>
              <h3>2024</h3>
            </div>
            <p>
              Passed Class 10 and became proficient in frontend development,
              working confidently with Node.js and popular frontend languages
              and frameworks.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Backend & Systems</h4>
                <h5>Python, C++ & Full Stack</h5>
              </div>
              <h3>2026</h3>
            </div>
            <p>
              Learned Python and C++ in depth, and started building backend
              systems as a full stack web developer — combining frontend skills
              with server-side architecture.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>College Begins</h4>
                <h5>Next Chapter</h5>
              </div>
              <h3>Aug 2026</h3>
            </div>
            <p>
              Starting college in August 2026 — ready to dive deeper into
              computer science and learn many more technologies along the way.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
