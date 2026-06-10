import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./modules/app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Ingestion completion callbacks can carry many chunks; raise the JSON body limit.
  app.useBodyParser("json", { limit: "25mb" });
  const config = app.get(ConfigService);
  const port = config.get<number>("API_PORT", 3001);

  app.enableCors({
    origin: config.get<string>("WEB_ORIGIN", "http://localhost:3000"),
    credentials: true
  });

  await app.listen(port);
}

void bootstrap();
