import "./index.css";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { applyBranding, loadBranding } from "./lib/branding";

// theme the document before the first paint (no flash of the default colors)
applyBranding(loadBranding());

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}
