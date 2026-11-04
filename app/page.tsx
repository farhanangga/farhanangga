import { About } from "../components/about";
import { BestProject } from "../components/best-project";
import { Experience } from "../components/experience";
import { sans } from "../components/fonts";
import { Footer } from "../components/footer";
import { Hero } from "../components/hero";
import { Navbar } from "../components/navbar";
import { Tools } from "../components/tools";
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
