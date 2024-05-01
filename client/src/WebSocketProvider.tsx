import { createContext, useContext, useEffect } from "react";
import WebSocketManager from "./lib/WebSocketManager";

const WebSocketContext = createContext<typeof WebSocketManager | null>(null);

export const WebSocketProvider = ({ children }: any) => {
  useEffect(() => {
    return () => {
      WebSocketManager.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={WebSocketManager}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
