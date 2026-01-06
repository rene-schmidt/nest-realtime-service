import { Controller, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ListMessagesQueryDto } from './dto/list-messages.query';
import * as jwt from 'jsonwebtoken';

//Allowed user roles within the messaging HTTP API context.
type Role = 'USER' | 'ADMIN';

//Supported message channel identifiers.
type ChannelKey = 'general' | 'support';

/**
 * HTTP controller for message-related operations.
 *
 * Provides endpoints for listing messages, flushing a channel,
 * and deleting individual messages. Authentication is performed
 * by verifying a JWT from the Authorization header.
 */
@Controller('messages')
export class MessagesController {
  /**
   * Creates a new MessagesController.
   *
   * @param messages Messages service providing business logic and persistence
   */
  constructor(private readonly messages: MessagesService) {}

  /**
   * Extracts a bearer token from an Authorization header value.
   *
   * @param auth Raw authorization header value
   * @returns JWT string if present, otherwise undefined
   */
  private extractBearer(auth?: unknown): string | undefined {
    // Normalize the header value to a string
    const v = typeof auth === 'string' ? auth : undefined;
    if (!v) return undefined;

    // Strip the Bearer prefix if present
    return v.startsWith('Bearer ') ? v.slice(7) : undefined;
  }

  /**
   * Reads and verifies the JWT from the request and returns the authenticated user.
   *
   * Returns null if the token is missing, invalid, or does not contain the required fields.
   *
   * @param req Incoming HTTP request object
   * @returns Authenticated user descriptor or null
   */
  private getUserFromReq(req: any): { id: string; role: Role } | null {
    // Extract token from Authorization header
    const token = this.extractBearer(req?.headers?.authorization);

    // Read JWT secret from environment
    const secret = process.env.JWT_ACCESS_SECRET;

    // Fail if prerequisites are missing
    if (!secret || !token) return null;

    try {
      // Verify token and read payload
      const payload = jwt.verify(token, secret) as any;

      // Read subject as user id
      const id = payload.sub as string | undefined;

      // Accept only known roles
      const role: Role =
        payload.role === 'ADMIN' || payload.role === 'USER'
          ? payload.role
          : undefined;

      // Require both id and role
      if (!id || !role) return null;

      return { id, role };
    } catch {
      // Treat any verification errors as unauthorized
      return null;
    }
  }

  /**
   * Lists messages for a channel.
   *
   * Enforces authentication and channel access rules before returning messages.
   *
   * @param q Query parameters (channel, pagination)
   * @param req Incoming HTTP request object
   * @returns Either an error object or a list of messages
   */
  @Get()
  async list(@Query() q: ListMessagesQueryDto, @Req() req: any) {
    // Authenticate the request via JWT
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    // Cast query channel to a supported channel key
    const channelKey = q.channel as ChannelKey;

    // Enforce channel-level access control
    this.messages.assertChannelAccess(channelKey, user.role);

    // Apply default page size if none provided
    const take = q.take ?? 50;

    // Delegate to service for message retrieval
    return this.messages.listMessages({ channelKey, take, cursor: q.cursor });
  }

  /**
   * Deletes all messages for the given channel.
   *
   * This endpoint is restricted to administrators.
   *
   * @param channel Channel identifier
   * @param req Incoming HTTP request object
   * @returns Either an error object or a deletion summary
   */
  @Delete('flush')
  async flush(@Query('channel') channel: ChannelKey, @Req() req: any) {
    // Authenticate the request via JWT
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    // Enforce admin-only access
    this.messages.assertAdmin(user.role);

    // Delegate to service for channel flush
    return this.messages.flushChannel(channel);
  }

  /**
   * Deletes a single message by its ID.
   *
   * This endpoint is restricted to administrators.
   *
   * @param id Message identifier
   * @param req Incoming HTTP request object
   * @returns Either an error object or a deletion result
   */
  @Delete(':id')
  async deleteOne(@Param('id') id: string, @Req() req: any) {
    // Authenticate the request via JWT
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    // Enforce admin-only access
    this.messages.assertAdmin(user.role);

    // Delegate to service for message deletion
    return this.messages.deleteMessageById(id);
  }
}
