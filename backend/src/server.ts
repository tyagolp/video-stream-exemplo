import Fastify from "fastify";
import FastifyWebSocket from "@fastify/websocket";
import FastifyStatic from "@fastify/static";
import FastifyCors from "@fastify/cors";

import { Websocket } from "./websocket";
import { Routes } from "./route";
import { hlsDirectory } from "./utils/saveStream";

const fastify = Fastify({ logger: true });

fastify.register(FastifyWebSocket);
fastify.register(FastifyCors, {
  origin: "http://localhost:3000",
});
fastify.register(FastifyStatic, {
  root: hlsDirectory,
  prefix: "/src/hls/", // Static route
});

fastify.register(Websocket);
fastify.register(Routes);

// Inicialize o servidor
const startServer = async () => {
  try {
    await fastify.listen({ port: 3333 });
    console.log("Servidor rodando em http://localhost:3333");
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

startServer();
