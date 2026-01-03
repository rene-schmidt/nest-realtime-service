import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Role = 'USER' | 'ADMIN';
type ChannelKey = 'general' | 'support';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  assertChannelAccess(channel: ChannelKey, role: Role) {
    if (channel === 'support' && role !== 'ADMIN') {
      throw new ForbiddenException('No access to support channel');
    }
  }

  assertAdmin(role: Role) {
    if (role !== 'ADMIN') throw new ForbiddenException('ADMIN only');
  }

  async createMessage(input: {
    channelKey: ChannelKey;
    authorId: string;
    authorRole: Role;
    content: string;
  }) {
    return this.prisma.message.create({
      data: input,
      select: {
        id: true,
        channelKey: true,
        authorId: true,
        authorRole: true,
        content: true,
        createdAt: true,
      },
    });
  }

  async listMessages(params: { channelKey: ChannelKey; take: number; cursor?: string }) {
    const { channelKey, take, cursor } = params;

    return this.prisma.message.findMany({
      where: { channelKey },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        channelKey: true,
        authorId: true,
        authorRole: true,
        content: true,
        createdAt: true,
      },
    });
  }

  async flushChannel(channelKey: ChannelKey) {
    const result = await this.prisma.message.deleteMany({
      where: { channelKey },
    });
    return { deleted: result.count, channelKey };
  }

  async deleteMessageById(id: string) {
    const existing = await this.prisma.message.findUnique({
      where: { id },
      select: { id: true, channelKey: true },
    });
    if (!existing) throw new NotFoundException('Message not found');

    await this.prisma.message.delete({ where: { id } });
    return { deleted: true, id, channelKey: existing.channelKey };
  }
}
