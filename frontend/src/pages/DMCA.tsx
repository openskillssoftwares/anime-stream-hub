import { Navbar } from "@/components/Navbar";

const DMCA = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-20 max-w-3xl">
        <h1 className="font-display text-4xl font-semibold mb-4">DMCA Policy</h1>
        <p className="text-muted-foreground mb-4">
          We respect intellectual property rights. If you believe your copyrighted work appears on this site without authorization,
          submit a notice with all required details and we will review promptly.
        </p>
        <div className="space-y-3 text-sm text-foreground/90">
          <p>1. Your legal name and contact information.</p>
          <p>2. Description of copyrighted work and proof of ownership.</p>
          <p>3. URL(s) where infringing content appears.</p>
          <p>4. A statement of good-faith belief and accuracy.</p>
          <p>5. Your physical/electronic signature.</p>
        </div>
      </main>
    </div>
  );
};

export default DMCA;
