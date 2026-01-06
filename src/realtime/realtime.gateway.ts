import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { MessagesService } from '../messages/messages.service';

/**
 * Realtime service intentionally does NOT depend on Prisma enums.
 *
 * Channel keys and roles are derived from application logic / JWT payloads
 * to keep the gateway decoupled from persistence-layer concerns.
 */

//Allowed user roles within the realtime context.
type Role = 'USER' | 'ADMIN';

//Allowed channel identifiers for websocket communication.
type ChannelKey = 'general' | 'support';

//Representation of an authenticated websocket user.
type WsUser = {
  /** Unique user identifier (usually JWT `sub`) */
  id: string;

  /** Optional user email address */
  email?: string;

  /** Role derived from JWT payload */
  role: Role;
};

/**
 * WebSocket gateway responsible for realtime messaging.
 *
 * Handles authentication via JWT, channel access control,
 * and message broadcasting using Socket.IO.
 */
@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway {
  /**
   * Underlying Socket.IO server instance.
   */
  @WebSocketServer()
  server!: Server;

  /**
   * Creates a new RealtimeGateway.
   *
   * @param messages Service responsible for message persistence and access checks
   */
  constructor(private readonly messages: MessagesService) {}

  /**
   * Handles a new websocket client connection.
   *
   * Authenticates the client using a JWT provided either via
   * `handshake.auth.token` or the `Authorization` header.
   *
   * @param client Connected socket instance
   */
  handleConnection(client: Socket) {
    // Read token from handshake auth or Authorization header
    const token =
      client.handshake.auth?.token ||
      this.extractBearer(client.handshake.headers.authorization);

    // Read JWT secret from environment
    const secret = process.env.JWT_ACCESS_SECRET;

    // Fail early if JWT secret is not configured
    if (!secret) {
      client.data.user = undefined;
      client.emit('auth.error', { error: 'JWT_ACCESS_SECRET is not set' });
      return;
    }

    // Fail if no token was provided
    if (!token) {
      client.data.user = undefined;
      client.emit('auth.error', { error: 'Missing token' });
      return;
    }

    try {
      // Verify JWT and extract payload
      const payload = jwt.verify(token, secret) as any;

      // Normalize role to allowed values
      const role: Role =
        payload.role === 'ADMIN' || payload.role === 'USER'
          ? payload.role
          : 'USER';

      // Build websocket user object
      const user: WsUser = {
        id: payload.sub,
        email: payload.email,
        role,
      };

      // Ensure required user identifier is present
      if (!user.id) {
        client.data.user = undefined;
        client.emit('auth.error', { error: 'Invalid token payload' });
        return;
      }

      // Store authenticated user on socket context
      client.data.user = user;

      // Notify client about successful authentication
      client.emit('auth.ok', { id: user.id, role: user.role });
    } catch (e: any) {
      // Handle JWT verification errors
      client.data.user = undefined;
      client.emit('auth.error', {
        error: `JWT verify failed: ${e?.message ?? 'unknown'}`,
      });
    }
  }

  /**
   * Handles websocket client disconnection.
   *
   * Currently no cleanup logic is required.
   *
   * @param _client Disconnected socket instance
   */
  handleDisconnect(_client: Socket) {}

  /**
   * Extracts a Bearer token from an Authorization header value.
   *
   * @param auth Raw authorization header value
   * @returns JWT string if present, otherwise undefined
   */
  private extractBearer(auth?: unknown): string | undefined {
    const v = typeof auth === 'string' ? auth : undefined;
    if (!v) return undefined;
    return v.startsWith('Bearer ') ? v.slice(7) : undefined;
  }

  /**
   * Retrieves the authenticated websocket user or emits an auth error.
   *
   * @param client Socket instance
   * @returns Authenticated user or null if unauthorized
   */
  private getUserOrFail(client: Socket): WsUser | null {
    const user = client.data.user as WsUser | undefined;
    if (!user) {
      client.emit('auth.error', { error: 'UNAUTHORIZED' });
      return null;
    }
    return user;
  }

  /**
   * Handles requests to join a channel.
   *
   * Validates authentication and channel access permissions
   * before joining the Socket.IO room.
   *
   * @param client Connected socket
   * @param body Payload containing the channel key
   */
  @SubscribeMessage('channel.join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channel: ChannelKey },
  ) {
    try {
      // Ensure the user is authenticated
      const user = this.getUserOrFail(client);
      if (!user) return { ok: false, error: 'UNAUTHORIZED' };

      // Extract requested channel
      const channelKey = body.channel;

      // Validate access rights for the channel
      this.messages.assertChannelAccess(channelKey, user.role);

      // Join the Socket.IO room
      await client.join(channelKey);

      // Return success response
      return { ok: true, joined: channelKey };
    } catch (e: any) {
      // Handle access or join errors
      return { ok: false, error: e?.message ?? 'JOIN_FAILED' };
    }
  }

  /**
   * Handles sending a new message to a channel.
   *
   * Performs authentication, authorization, input validation,
   * message persistence, and realtime broadcasting.
   *
   * @param client Connected socket
   * @param body Payload containing channel key and message content
   */
  @SubscribeMessage('message.send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channel: ChannelKey; content: string },
  ) {
    try {
      // Ensure the user is authenticated
      const user = this.getUserOrFail(client);
      if (!user) return { ok: false, error: 'UNAUTHORIZED' };

      // Extract channel identifier
      const channelKey = body.channel;

      // Validate access rights for the channel
      this.messages.assertChannelAccess(channelKey, user.role);

      // Normalize and validate message content
      const content = (body.content ?? '').trim();
      if (!content || content.length > 500) {
        return { ok: false, error: 'Invalid content' };
      }

      // Persist the message
      const saved = await this.messages.createMessage({
        channelKey,
        authorId: user.id,
        authorRole: user.role,
        content,
      });

      // Broadcast the new message to all channel members
      this.server.to(channelKey).emit('message.new', saved);

      // Return success response with message identifier
      return { ok: true, messageId: saved.id };
    } catch (e: any) {
      // Handle persistence or broadcast errors
      return { ok: false, error: e?.message ?? 'SEND_FAILED' };
    }
  }
}
