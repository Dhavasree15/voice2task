import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import AppScreen from "./pages/AppScreen";

function App() {
  const [showAppScreen, setShowAppScreen] = useState(false);

  return showAppScreen ? (
    <AppScreen />
  ) : (
    <LandingPage onStart={() => setShowAppScreen(true)} />
  );
}

export default App;