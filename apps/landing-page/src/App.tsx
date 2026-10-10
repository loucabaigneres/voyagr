import { CtaBand } from './components/CtaBand';
import { Faq } from './components/Faq';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ScrollToTop } from './components/ScrollToTop';
import { useWaitlistStatus } from './lib/waitlist';

export default function App() {
  const { joinedEmail, markJoined } = useWaitlistStatus();

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main>
        <Hero joinedEmail={joinedEmail} onJoined={markJoined} />
        <Features />
        <Faq />
        <CtaBand joinedEmail={joinedEmail} onJoined={markJoined} />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
