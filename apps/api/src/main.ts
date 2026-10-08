import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HttpFilter } from "./common/http.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"], credentials: true });
  app.useGlobalFilters(new HttpFilter());
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
