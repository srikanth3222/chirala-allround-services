let io;
let onlineProviders = {};
let onlineCustomers = {};
let onlineAdmins = {};

const initSocket = (server, allowedOrigins) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: allowedOrigins || ["http://localhost:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("registerProvider", (providerId) => {
      onlineProviders[providerId] = socket.id;
      console.log("Provider online:", providerId);
    });

    socket.on("registerCustomer", (customerId) => {
      onlineCustomers[customerId] = socket.id;
      console.log("Customer online:", customerId);
    });

    socket.on("registerAdmin", (adminId) => {
      onlineAdmins[adminId] = socket.id;
      console.log("Admin online:", adminId);
    });

    socket.on("disconnect", () => {
      for (let id in onlineProviders) {
        if (onlineProviders[id] === socket.id) {
          delete onlineProviders[id];
        }
      }
      for (let id in onlineCustomers) {
        if (onlineCustomers[id] === socket.id) {
          delete onlineCustomers[id];
        }
      }
      for (let id in onlineAdmins) {
        if (onlineAdmins[id] === socket.id) {
          delete onlineAdmins[id];
        }
      }
    });
  });
};

module.exports = {
  initSocket,
  getIO: () => io,
  onlineProviders,
  onlineCustomers,
  onlineAdmins,
};