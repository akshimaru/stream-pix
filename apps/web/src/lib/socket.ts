"use client";

import { io, type Socket } from "socket.io-client";
import { getApiUrl } from "./api";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(getApiUrl(), {
      transports: ["websocket"],
      withCredentials: true,
      autoConnect: true,
    });
  }

  return socket;
}
