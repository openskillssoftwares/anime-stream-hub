import { Link } from "react-router-dom";

export const SiteFooter = () => {
  return (
    <footer className="border-t border-border/40 mt-14">
      <div className="container py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm">
        <p className="text-muted-foreground">
          Disclaimer: This site does not store media files on its own server. Content is embedded from third-party providers.
        </p>
        <div className="flex items-center gap-4">
          <Link to="/dmca" className="text-muted-foreground hover:text-foreground transition-colors">DMCA</Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact us</Link>
          <Link to="/donation" className="text-muted-foreground hover:text-foreground transition-colors">Donation</Link>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
