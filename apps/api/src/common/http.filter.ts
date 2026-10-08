import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Response } from "express";

@Catch()
export class HttpFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        response.status(status).json({ message: body, errors: [] });
        return;
      }
      const record = body as { message?: unknown; errors?: unknown };
      const message = Array.isArray(record.message)
        ? record.message.join(", ")
        : String(record.message ?? "Xəta");
      response.status(status).json({
        message,
        errors: Array.isArray(record.errors) ? record.errors : [],
      });
      return;
    }
    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: "Daxili xəta", errors: [] });
  }
}
