import React from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import ExperienceTimeline from "./components/ExperienceTimeline";
import SkillsGrid from "./components/SkillsGrid";
import Projects from "./components/Projects";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import CustomCursor from "./components/CustomCursor";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-text selection:bg-primary selection:text-black">
      <CustomCursor />
      <Navbar />
      <main>
        <Hero />
        <About />
        <ExperienceTimeline />
        <SkillsGrid />
        <Projects />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default App;
