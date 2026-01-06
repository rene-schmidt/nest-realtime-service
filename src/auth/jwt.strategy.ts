import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * JWT authentication strategy.
 *
 * Integrates Passport's JWT strategy with NestJS to handle
 * bearer-token based authentication.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  /**
   * Creates and configures the JWT strategy.
   *
   * The JWT is extracted from the Authorization header using
   * the Bearer scheme and verified using the access token secret.
   */
  constructor() {
    super({
      // Extract JWT from the Authorization: Bearer <token> header
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Secret used to verify the JWT signature
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  /**
   * Validates the decoded JWT payload.
   *
   * The returned object is attached to the request as `req.user`.
   *
   * @param payload Decoded JWT payload
   * @returns Normalized user object for the request context
   */
  async validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
