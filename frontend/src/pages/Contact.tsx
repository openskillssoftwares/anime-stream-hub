import { Navbar } from "@/components/Navbar";

const Contact = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container pt-28 pb-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-4">Contact us</h1>
        <p className="text-muted-foreground">For support, DMCA requests, or urgent issues, contact:</p>
        <p className="mt-3 text-sm">Email: heyanimetouch@gmail.com</p>
      </main>
    </div>
  );
};

export default Contact;
