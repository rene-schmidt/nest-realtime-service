import { Controller, Delete, Get, Param, Query, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { ListMessagesQueryDto } from './dto/list-messages.query';
import { ChannelKey, Role } from '@prisma/client';
import * as jwt from 'jsonwebtoken';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  private extractBearer(auth?: unknown): string | undefined {
    const v = typeof auth === 'string' ? auth : undefined;
    if (!v) return undefined;
    return v.startsWith('Bearer ') ? v.slice(7) : undefined;
  }

  private getUserFromReq(req: any): { id: string; role: Role } | null {
    const token = this.extractBearer(req?.headers?.authorization);
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret || !token) return null;

    try {
      const payload = jwt.verify(token, secret) as any;
      const id = payload.sub as string | undefined;
      const role = payload.role as Role | undefined;
      if (!id || !role) return null;
      return { id, role };
    } catch {
      return null;
    }
  }

  @Get()
  async list(@Query() q: ListMessagesQueryDto, @Req() req: any) {
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    const channelKey = q.channel as ChannelKey;
    this.messages.assertChannelAccess(channelKey, user.role);

    const take = q.take ?? 50;
    return this.messages.listMessages({ channelKey, take, cursor: q.cursor });
  }


  @Delete('flush')
  async flush(@Query('channel') channel: 'general' | 'support', @Req() req: any) {
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    this.messages.assertAdmin(user.role);

    const channelKey = channel as ChannelKey;
    
    return this.messages.flushChannel(channelKey);
  }

  @Delete(':id')
  async deleteOne(@Param('id') id: string, @Req() req: any) {
    const user = this.getUserFromReq(req);
    if (!user) return { ok: false, error: 'UNAUTHORIZED' };

    this.messages.assertAdmin(user.role);

    return this.messages.deleteMessageById(id);
  }
}
