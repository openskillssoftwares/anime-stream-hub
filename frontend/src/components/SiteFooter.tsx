import { Link } from "react-router-dom";

export const SiteFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 mt-14">
      <div className="container py-8 flex flex-col gap-4 text-sm">
        {/* Top row: Disclaimer */}
        <p className="text-muted-foreground text-center md:text-left">
          Disclaimer: This site does not store media files on its own server. Content is embedded from third-party providers.
        </p>

        {/* Bottom row: Copyright + Links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground">
            © {currentYear} <span className="font-semibold text-foreground">Hey Anime!</span> All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <Link to="/dmca" className="text-muted-foreground hover:text-foreground transition-colors">DMCA</Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact us</Link>
            <Link to="/donation" className="text-muted-foreground hover:text-foreground transition-colors">Donation</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
