import { Global, Module } from "@nestjs/common";
import { AuditService } from "./common/audit";

@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
