import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Loading from "../components/Loading";

/** Max wait before revealing the site — never block UX on the 3D character. */
const REVEAL_DEADLINE_MS = 2500;

interface LoadingType {
  isLoading: boolean;
  setIsLoading: (state: boolean) => void;
  setLoading: (percent: number) => void;
}

export const LoadingContext = createContext<LoadingType | null>(null);

export const LoadingProvider = ({ children }: PropsWithChildren) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(0);
  const revealedRef = useRef(false);

  const value = {
    isLoading,
    setIsLoading,
    setLoading,
  };

  useEffect(() => {
    const forceReveal = () => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      setLoading(100);
    };

    const deadline = window.setTimeout(forceReveal, REVEAL_DEADLINE_MS);
    return () => window.clearTimeout(deadline);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("site-loading", isLoading);
    return () => document.body.classList.remove("site-loading");
  }, [isLoading]);

  return (
    <LoadingContext.Provider value={value as LoadingType}>
      {isLoading && <Loading percent={loading} />}
      <main className="main-body">{children}</main>
    </LoadingContext.Provider>
  );
};

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
};
