"use client";
import rt, { getRealtimeClient, getStableUserId } from "./provider";

const client: any = rt;

// Ajout de méthodes legacy si absentes
if (typeof client.publish !== "function") {
  client.publish = (room: string, event: string, data: any) => {
    if (typeof client.setRoom === "function") client.setRoom(room);
    return client.emit(event, data);
  };
}
if (typeof client.trigger !== "function") {
  client.trigger = (room: string, event: string, data: any) => {
    return client.publish(room, event, data);
  };
}
if (typeof client.subscribe !== "function") {
  client.subscribe = (room: string, event: string, handler: (d: any) => void) => {
    if (typeof client.setRoom === "function") client.setRoom(room);
    return client.on(event, handler);
  };
}
if (typeof client.setUser !== "function") {
  client.setUser = (user: any) => {
    // fallback: reconnecte avec la nouvelle identité si l’API moderne est présente
    const id = user?.id ?? client.user?.id ?? getStableUserId();
    const name = user?.name ?? client.user?.name ?? "Anonyme";
    const role = user?.role ?? client.user?.role ?? "employe";
    if (typeof client.connect === "function") {
      client.connect(client.room || "default", id, name, role);
    }
  };
}

export default client;
export { client as rt, getRealtimeClient, getStableUserId };
