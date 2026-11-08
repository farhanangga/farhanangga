import { About } from "../components/landingPage/about";
import { BestProject } from "../components/landingPage/best-project";
import { Experience } from "../components/landingPage/experience";
import { sans } from "../components/fonts";
import { Footer } from "../components/layout/footer";
import { Hero } from "../components/landingPage/hero";
import { Navbar } from "../components/layout/navbar";
import { Tools } from "../components/landingPage/tools";
import { MotionProvider, ScrollProgress } from "../components/ui";

export default function HomePage() {
  return (
    <MotionProvider>
      <main className={`${sans.className} min-h-screen overflow-x-hidden bg-[#02020F] text-white`}>
        <ScrollProgress />
        <Navbar />
        <Hero />
        <About />
        <BestProject />
        <Experience />
        <Tools />
        <Footer />
      </main>
    </MotionProvider>
  );
}
