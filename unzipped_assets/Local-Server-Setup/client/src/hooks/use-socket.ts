import { useEffect, useRef, useState } from "react";
import { type WsMessage } from "@shared/schema";

export function useSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const listeners = useRef<Map<string, (payload: any) => void>>(new Map());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        const listener = listeners.current.get(message.type);
        if (listener) {
          listener(message.payload);
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const onMessage = <T extends WsMessage['type']>(
    type: T,
    callback: (payload: Extract<WsMessage, { type: T }>['payload']) => void
  ) => {
    listeners.current.set(type, callback);
  };

  return { socket, isConnected, onMessage };
}
