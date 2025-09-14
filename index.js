// juribly/index.js
// Run: node index.js
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
require("dotenv").config();

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173").split(",");

const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.get("/", (_, res) => res.send("Juribly realtime OK"));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

// in-memory rooms
const rooms = {}; // trialId -> { participants: Map(socketId -> participant) }

function getRoom(trialId) {
  if (!rooms[trialId]) rooms[trialId] = { participants: new Map() };
  return rooms[trialId];
}

function publicParticipant(p) {
  return {
    socketId: p.socketId,
    role: p.role,
    name: p.name,
    handle: p.handle,
    profile_id: p.profile_id,
    color: p.color,
    pose: p.pose || null,
    emote: p.emote || 0,
  };
}

io.on("connection", (socket) => {
  socket.on("room:join", (payload, ack) => {
    try {
      const { trialId, role="Audience", name="Guest", handle=null, profile_id=null } = payload || {};
      if (!trialId) return ack?.({ ok: false, error: "trialId required" });

      socket.join(trialId);
      const room = getRoom(trialId);

      const participant = {
        socketId: socket.id,
        role,
        name,
        handle,
        profile_id,
        color: role === "Judge" ? "#f7c85f" : role === "Accused" ? "#ff6b6b" : "#7aa7ff",
        pose: { x: 0, y: 0.9, z: 0, ry: 0 },
        emote: 0,
      };
      room.participants.set(socket.id, participant);

      // full snapshot to joiner
      const snapshot = Array.from(room.participants.values()).map(publicParticipant);
      socket.emit("presence:state", { participants: snapshot });

      // notify others
      socket.to(trialId).emit("presence:joined", publicParticipant(participant));

      ack?.({ ok: true, self: publicParticipant(participant) });
    } catch (e) {
      ack?.({ ok: false, error: e?.message || "join failed" });
    }
  });

  socket.on("pose:update", ({ trialId, pose }) => {
    if (!trialId) return;
    const room = rooms[trialId];
    if (!room) return;
    const p = room.participants.get(socket.id);
    if (!p) return;
    p.pose = pose;
    socket.to(trialId).emit("pose:broadcast", { socketId: socket.id, pose });
  });

  socket.on("emote:update", ({ trialId, emote }) => {
    if (!trialId) return;
    const room = rooms[trialId];
    if (!room) return;
    const p = room.participants.get(socket.id);
    if (!p) return;
    p.emote = emote;
    socket.to(trialId).emit("emote:update", { socketId: socket.id, emote });
  });

  socket.on("room:leave", ({ trialId }) => {
    if (!trialId) return;
    const room = rooms[trialId];
    if (!room) return;
    room.participants.delete(socket.id);
    socket.leave(trialId);
    socket.to(trialId).emit("presence:left", { socketId: socket.id });
  });

  socket.on("disconnect", () => {
    for (const [trialId, room] of Object.entries(rooms)) {
      if (room.participants.delete(socket.id)) {
        socket.to(trialId).emit("presence:left", { socketId: socket.id });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[realtime] listening on ${PORT} (CORS ${CORS_ORIGIN.join(", ")})`);
});
