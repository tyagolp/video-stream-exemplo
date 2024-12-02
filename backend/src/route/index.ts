import { FastifyInstance } from "fastify";
import { saveStartStreaming } from "../utils/saveStream";

export async function Routes(app: FastifyInstance) {
  // Endpoint para iniciar o stream
  app.get("/start-stream", async (request, reply) => {
    try {
      saveStartStreaming();
      reply.send({ message: "Streaming iniciado" });
    } catch (error) {
      reply.status(500).send({ error: "Erro ao iniciar o streaming" });
    }
  });

  // Endpoint para verificar o status do servidor
  app.get("/status", async (request, reply) => {
    reply.send({ status: "Servidor ativo" });
  });
}
