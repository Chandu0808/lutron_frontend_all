import { getValidToken } from "../auth/authToken";

const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30000;

function buildHeatmapLiveWsUrl(token) {
  const apiBase = (
    process.env.REACT_APP_API_URL || "http://localhost:8000"
  ).replace(/\/$/, "");
  const wsBase = apiBase.replace(/^http/i, (match) =>
    match.toLowerCase() === "https" ? "wss" : "ws"
  );
  const encoded = encodeURIComponent(token);
  return `${wsBase}/ws/heatmap/live?token=${encoded}`;
}

/**
 * One WebSocket per heatmap tab. Replaces timer polling for live map/sidebar.
 */
export function createHeatmapLiveSocket(handlers = {}) {
  let socket = null;
  let reconnectTimer = null;
  let reconnectAttempt = 0;
  let closedByUser = false;
  let subscription = {
    floor_id: null,
    area_id: null,
    display_mode: "Light",
  };

  const clearReconnect = () => {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const sendSubscribe = () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(
      JSON.stringify({
        action: "subscribe",
        floor_id: subscription.floor_id,
        area_id: subscription.area_id,
        display_mode: subscription.display_mode,
      })
    );
  };

  const scheduleReconnect = () => {
    if (closedByUser) return;
    clearReconnect();
    const delay = Math.min(
      RECONNECT_MAX_MS,
      RECONNECT_BASE_MS * 2 ** reconnectAttempt
    );
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(() => {
      connect();
    }, delay);
  };

  const connect = () => {
    if (closedByUser) return;

    const token = getValidToken();
    if (!token) {
      scheduleReconnect();
      return;
    }

    try {
      if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
        return;
      }
      socket = new WebSocket(buildHeatmapLiveWsUrl(token));
    } catch (error) {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      reconnectAttempt = 0;
      sendSubscribe();
      if (typeof handlers.onOpen === "function") {
        handlers.onOpen();
      }
    };

    socket.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch (error) {
        return;
      }

      const { type, payload } = message || {};
      if (type === "floor_light" && payload && handlers.onFloorLight) {
        handlers.onFloorLight(payload);
      } else if (
        type === "floor_occupancy" &&
        payload &&
        handlers.onFloorOccupancy
      ) {
        handlers.onFloorOccupancy(payload);
      } else if (type === "area_status" && payload && handlers.onAreaStatus) {
        handlers.onAreaStatus(payload);
      }
    };

    socket.onclose = () => {
      socket = null;
      if (!closedByUser) {
        scheduleReconnect();
      }
    };

    socket.onerror = () => {
      try {
        socket?.close();
      } catch (error) {
        // ignore
      }
    };
  };

  return {
    subscribe(next) {
      subscription = {
        floor_id: next.floorId ?? null,
        area_id: next.areaId ?? null,
        display_mode: next.displayMode ?? "Light",
      };
      sendSubscribe();
    },
    start() {
      closedByUser = false;
      connect();
    },
    close() {
      closedByUser = true;
      clearReconnect();
      if (socket) {
        try {
          socket.close();
        } catch (error) {
          // ignore
        }
        socket = null;
      }
    },
  };
}

export default createHeatmapLiveSocket;
