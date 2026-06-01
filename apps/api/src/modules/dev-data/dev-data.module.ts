import { Module } from "@nestjs/common";
import { DevDataController } from "./dev-data.controller";
import { DevDataService } from "./dev-data.service";

@Module({
  controllers: [DevDataController],
  providers: [DevDataService],
  exports: [DevDataService]
})
export class DevDataModule {}
