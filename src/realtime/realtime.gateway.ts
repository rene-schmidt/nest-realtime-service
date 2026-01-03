import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChannelKey, Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { MessagesService } from '../messages/messages.service';

type WsUser = { id: string; email?: string; role: Role };


@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly messages: MessagesService) {}

  handleConnection(client: Socket) {

    const token =
      client.handshake.auth?.token ||
      this.extractBearer(client.handshake.headers.authorization);

    const secret = process.env.JWT_ACCESS_SECRET;

    if (!secret) {
      client.data.user = undefined;
      client.emit('auth.error', { error: 'JWT_ACCESS_SECRET is not set' });
      return;
    }

    if (!token) {
      client.data.user = undefined;
      client.emit('auth.error', { error: 'Missing token' });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as any;

      const user: WsUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role as Role,
      };

      if (!user.id || !user.role) {
        client.data.user = undefined;
        client.emit('auth.error', { error: 'Invalid token payload' });
        return;
      }

      client.data.user = user;
      client.emit('auth.ok', { id: user.id, role: user.role });
    } catch (e: any) {
      client.data.user = undefined;
      client.emit('auth.error', { error: `JWT verify failed: ${e?.message ?? 'unknown'}` });
    }
  }

  handleDisconnect(_client: Socket) {
    
  }

  private extractBearer(auth?: unknown): string | undefined {
    const v = typeof auth === 'string' ? auth : undefined;
    if (!v) return undefined;
    return v.startsWith('Bearer ') ? v.slice(7) : undefined;
  }

  private getUserOrFail(client: Socket): WsUser | null {
    const user = client.data.user as WsUser | undefined;
    if (!user) {
      client.emit('auth.error', { error: 'UNAUTHORIZED' });
      return null;
    }
    return user;
  }

  @SubscribeMessage('channel.join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channel: 'general' | 'support' },
  ) {
    try {
      const user = this.getUserOrFail(client);
      if (!user) return { ok: false, error: 'UNAUTHORIZED' };

      const channelKey = body.channel as ChannelKey;

      this.messages.assertChannelAccess(channelKey, user.role);

      await client.join(channelKey);
      return { ok: true, joined: channelKey };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'JOIN_FAILED' };
    }
  }

  @SubscribeMessage('message.send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { channel: 'general' | 'support'; content: string },
  ) {
    try {
      const user = this.getUserOrFail(client);
      if (!user) return { ok: false, error: 'UNAUTHORIZED' };

      const channelKey = body.channel as ChannelKey;

      this.messages.assertChannelAccess(channelKey, user.role);

      const content = (body.content ?? '').trim();
      if (!content || content.length > 500) {
        return { ok: false, error: 'Invalid content' };
      }

      const saved = await this.messages.createMessage({
        channelKey,
        authorId: user.id,
        authorRole: user.role,
        content,
      });

      this.server.to(channelKey).emit('message.new', saved);
      return { ok: true, messageId: saved.id };
    } catch (e: any) {
      return { ok: false, error: e?.message ?? 'SEND_FAILED' };
    }
  }
  
}


