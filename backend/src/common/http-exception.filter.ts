import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500;
    let message: string | string[] = 'Não foi possível concluir a operação. Tente novamente.';
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : (body as { message: string | string[] }).message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        message = 'Já existe um registro com este SKU, e-mail ou combinação de cor e tamanho.';
      } else if (exception.code === 'P2003') {
        status = 400;
        message = 'O registro relacionado não existe ou está em uso.';
      } else if (exception.code === 'P2025') {
        status = 404;
        message = 'Registro não encontrado.';
      }
    }
    if (status === 500) this.logger.error(exception);
    response
      .status(status)
      .json({ statusCode: status, message, timestamp: new Date().toISOString() });
  }
}
