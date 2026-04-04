import { Link } from 'react-router-dom';
import { GraduationCap, Instagram, Youtube } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/constants';

const socialItems = [
  { icon: Instagram, href: SOCIAL_LINKS.instagram, label: 'Instagram' },
  { icon: Youtube, href: SOCIAL_LINKS.youtube, label: 'YouTube' },
];

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container mx-auto px-4 py-12">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Link to="/" className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-7 w-7 text-primary" />
            <span className="text-lg font-bold text-gradient">Teach-Tribe</span>
          </Link>
          <p className="text-sm text-muted-foreground">Empowering learners worldwide with quality education accessible anytime, anywhere.</p>
          <div className="mt-4 flex gap-3">
            {socialItems.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="rounded-full border border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Company</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {['About Us', 'Careers', 'Blog', 'Press'].map(l => <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Resources</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {['Help Center', 'Community', 'Contact Us', 'Teach on Teach-Tribe'].map(l => <li key={l}><a href="#" className="hover:text-foreground">{l}</a></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Categories</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {['Web Development', 'Data Science', 'Design', 'Business'].map(l => <li key={l}><Link to={`/courses?category=${l}`} className="hover:text-foreground">{l}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Teach-Tribe. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
