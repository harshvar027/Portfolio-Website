import MainContainer from "./components/MainContainer";
import CharacterModel from "./components/Character";
import "./App.css";
import "./components/styles/enhance.css";
import "./components/styles/PurpleAtmosphere.css";
import { LoadingProvider } from "./context/LoadingProvider";
import { MusicReactiveProvider } from "./context/MusicReactiveContext";

const App = () => {
  return (
    <LoadingProvider>
      <MusicReactiveProvider>
        <MainContainer>
          <CharacterModel />
        </MainContainer>
      </MusicReactiveProvider>
    </LoadingProvider>
  );
};

export default App;
