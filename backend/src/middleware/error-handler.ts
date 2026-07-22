import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Erreur de validation",
      details: error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  if (error.statusCode === 429) {
    return reply
      .status(429)
      .send({ error: "Trop de requêtes. Réessayez plus tard." });
  }

  request.log.error(error, "Unhandled error");

  const statusCode = error.statusCode ?? 500;
  const message =
    statusCode === 500 ? "Erreur interne du serveur" : error.message;

  return reply.status(statusCode).send({ error: message });
}
