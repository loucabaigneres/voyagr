import cors from "@fastify/cors";
import Fastify from "fastify";

const server = Fastify({
  logger: true,
});

server.register(cors, {
  origin: "*", // Allow all origins for development purposes
});

server.get("/ping", async (request, reply) => {
  return { status: "ok", message: "Backend is running!" };
});

const start = async () => {
  try {
    // Listen on port 3000 and bind to all network interfaces for Docker compatibility
    await server.listen({ port: 3000, host: "0.0.0.0" });
    server.log.info("Server started at http://localhost:3000");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};
start();
