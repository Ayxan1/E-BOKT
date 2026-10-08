import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Public } from "../common/auth";
import type { AuthUser } from "../common/auth";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post("login")
  login(@Body() body: { username?: string; password?: string }) {
    return this.auth.login(body.username ?? "", body.password ?? "");
  }

  @Get("me")
  me(@Req() request: { user: AuthUser }) {
    return this.auth.me(request.user.id);
  }
}
