import { Module } from "@nestjs/common";
import { CollateralsController } from "./collaterals.controller";
import { CollateralsService } from "./collaterals.service";

@Module({ controllers: [CollateralsController], providers: [CollateralsService] })
export class CollateralsModule {}
