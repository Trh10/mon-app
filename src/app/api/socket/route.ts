import { NextRequest } from "next/server";
import { Server } from "socket.io";

export const runtime = "nodejs";

let io: Server | undefined;

export async function GET(req: NextRequest) {
  if (!io) {
    // @ts-ignore
    const httpServer = req.socket?.server;
    if (!httpServer) {
      return new Response("Socket.IO not available", { status: 500 });
    }

    io = new Server(httpServer, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NODE_ENV === "production" ? false : "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Client connecté:", socket.id);

      // Rejoindre une organisation
      socket.on("join-org", (orgSlug: string) => {
        socket.join(`org:${orgSlug}`);
        console.log(`Socket ${socket.id} rejoint org:${orgSlug}`);
      });

      // Quitter une organisation
      socket.on("leave-org", (orgSlug: string) => {
        socket.leave(`org:${orgSlug}`);
        console.log(`Socket ${socket.id} quitte org:${orgSlug}`);
      });

      // Diffuser un message dans l'organisation
      socket.on("org-message", (data: { orgSlug: string; message: any }) => {
        socket.to(`org:${data.orgSlug}`).emit("message", data.message);
      });

      // Diffuser une tâche dans l'organisation
      socket.on("org-task", (data: { orgSlug: string; task: any }) => {
        socket.to(`org:${data.orgSlug}`).emit("task", data.task);
      });

      // Présence utilisateur
      socket.on("user-presence", (data: { orgSlug: string; user: any }) => {
        socket.to(`org:${data.orgSlug}`).emit("presence", data.user);
      });

      socket.on("disconnect", () => {
        console.log("Client déconnecté:", socket.id);
      });
    });
  }

  return new Response("Socket.IO server running", { status: 200 });
}

export { GET as POST };