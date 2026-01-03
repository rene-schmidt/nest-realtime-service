import { ForbiddenException, Injectable } from '@nestjs/common';
import { ChannelKey, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  async createMessage(input: {
    channelKey: ChannelKey;
    authorId: string;
    authorRole: 'ADMIN' | 'USER';
    content: string;
  }) {
    return this.prisma.message.create({
      data: {
        channelKey: input.channelKey,
        authorId: input.authorId,
        authorRole: input.authorRole,
        content: input.content,
      },
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

  async listMessages(params: {
    channelKey: ChannelKey;
    take: number;
    cursor?: string;
  }) {
    const { channelKey, take, cursor } = params;

    return this.prisma.message.findMany({
      where: { channelKey },
      orderBy: { createdAt: 'desc' },
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
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

  assertChannelAccess(channel: ChannelKey, role: 'ADMIN' | 'USER') {
    if (channel === 'support' && role !== 'ADMIN') {
      throw new ForbiddenException('No access to support channel');
    }
  }
}
