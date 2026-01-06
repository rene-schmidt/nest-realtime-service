import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

//Allowed user roles within the messaging domain.
type Role = 'USER' | 'ADMIN';

//Supported message channel identifiers.
type ChannelKey = 'general' | 'support';

/**
 * Service responsible for message-related business logic.
 *
 * This includes access control, message persistence,
 * querying, and administrative operations.
 */
@Injectable()
export class MessagesService {
  /**
   * Creates a new MessagesService.
   *
   * @param prisma Prisma service used for database access
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Asserts that a user has access to a given channel.
   *
   * Throws a ForbiddenException if the role is not allowed
   * to access the specified channel.
   *
   * @param channel Channel identifier
   * @param role User role
   */
  assertChannelAccess(channel: ChannelKey, role: Role) {
    // Restrict support channel access to admins only
    if (channel === 'support' && role !== 'ADMIN') {
      throw new ForbiddenException('No access to support channel');
    }
  }

  /**
   * Asserts that the given role belongs to an administrator.
   *
   * @param role User role
   */
  assertAdmin(role: Role) {
    // Enforce admin-only access
    if (role !== 'ADMIN') throw new ForbiddenException('ADMIN only');
  }

  /**
   * Creates and persists a new message.
   *
   * @param input Message creation payload
   * @returns The persisted message with selected fields
   */
  async createMessage(input: {
    channelKey: ChannelKey;
    authorId: string;
    authorRole: Role;
    content: string;
  }) {
    // Persist message to the database
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

  /**
   * Lists messages for a given channel with pagination support.
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

  /**
   * Deletes all messages belonging to a specific channel.
   *
   * Intended for administrative or maintenance operations.
   *
   * @param channelKey Channel identifier
   * @returns Summary of deleted messages
   */
  async flushChannel(channelKey: ChannelKey) {
    // Delete all messages in the given channel
    const result = await this.prisma.message.deleteMany({
      where: { channelKey },
    });

    return { deleted: result.count, channelKey };
  }

  /**
   * Deletes a single message by its identifier.
   *
   * Throws a NotFoundException if the message does not exist.
   *
   * @param id Message identifier
   * @returns Deletion result metadata
   */
  async deleteMessageById(id: string) {
    // Check whether the message exists
    const existing = await this.prisma.message.findUnique({
      where: { id },
      select: { id: true, channelKey: true },
    });

    // Fail if message does not exist
    if (!existing) throw new NotFoundException('Message not found');

    // Delete the message
    await this.prisma.message.delete({ where: { id } });

    return { deleted: true, id, channelKey: existing.channelKey };
  }
}
