import { createRoot } from "react-dom/client";
import { gsap } from "gsap";
import App from "./App.tsx";
import "./index.css";

gsap.config({ trialWarn: false });

createRoot(document.getElementById("root")!).render(<App />);
