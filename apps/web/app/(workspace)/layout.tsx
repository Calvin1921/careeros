import "./style.css";
import { QueryProvider } from "./components/QueryProvider";
import { Navigation } from "./components/Navigation";
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Navigation />
        <QueryProvider>
          <div id="main-content">{children}</div>
        </QueryProvider>
      </>
  );
}
