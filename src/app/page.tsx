import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Skills from "@/components/Skills";
import Projects from "@/components/Projects";
import Experience from "@/components/Experience";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FlyingLogo from "@/components/FlyingLogo";
import { LoadingProvider } from "@/components/LoadingContext";

export default function Home() {
  return (
    <LoadingProvider>
      <LoadingScreen />
      <FlyingLogo />
      <Navigation />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Experience />
        <Contact />
      </main>
      <Footer />
    </LoadingProvider>
  );
}
