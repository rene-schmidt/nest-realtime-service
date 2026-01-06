import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

//Supported message channel identifiers.
type ChannelKey = 'general' | 'support';

/**
 * Service responsible for message persistence and
 * channel-level access control.
 */
@Injectable()
export class MessagesService {
  /**
   * Creates a new MessagesService.
   *
   * @param prisma Prisma service used to access the database
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Persists a new message in the database.
   *
   * @param input Message creation payload
   * @returns The newly created message with selected fields
   */
  async createMessage(input: {
    channelKey: ChannelKey;
    authorId: string;
    authorRole: 'ADMIN' | 'USER';
    content: string;
  }) {
    // Create a new message record
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

  /**
   * Retrieves a paginated list of messages for a given channel.
   *
   * Messages are returned in reverse chronological order.
   *
   * @param params Query parameters including channel and pagination info
   * @returns List of messages
   */
  async listMessages(params: {
    channelKey: ChannelKey;
    take: number;
    cursor?: string;
  }) {
    const { channelKey, take, cursor } = params;

    // Query messages with optional cursor-based pagination
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

  /**
   * Asserts that a user role has access to the specified channel.
   *
   * Throws a ForbiddenException if access is denied.
   *
   * @param channel Channel identifier
   * @param role User role
   */
  assertChannelAccess(channel: ChannelKey, role: 'ADMIN' | 'USER') {
    // Restrict support channel access to administrators only
    if (channel === 'support' && role !== 'ADMIN') {
      throw new ForbiddenException('No access to support channel');
    }
  }
}
