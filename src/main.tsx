import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./i18n";
import App from "./App";
import { firstTripId, seedIfEmpty } from "./db/repo";
import { startCloud } from "./sync/cloud";

// Ask the browser not to evict the offline copy when storage runs low.
navigator.storage?.persist?.().catch(() => undefined);

seedIfEmpty().then(async () => {
  const tripId = await firstTripId();
  if (tripId) startCloud(tripId);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
