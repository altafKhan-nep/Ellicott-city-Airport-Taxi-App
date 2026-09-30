import MobileAppBar from './MobileAppBar.jsx';
import MobileTabBar from './MobileTabBar.jsx';

// Wraps the app for phone viewports: slim top bar, no marketing footer, and a
// persistent bottom tab bar. `App.jsx` renders the site Navbar/Footer only when
// this is not used, so tablets and desktop are untouched.
export default function MobileShell({ children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      <MobileAppBar />
      {/* A plain div, not <main>: App.jsx already owns the single <main>
          landmark, and nesting a second one is invalid HTML. */}
      <div className="tab-clearance flex-1">{children}</div>
      <MobileTabBar />
    </div>
  );
}
