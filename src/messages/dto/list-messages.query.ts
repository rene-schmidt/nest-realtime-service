import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Data Transfer Object (DTO) for listing messages.
 *
 * This DTO validates and describes the supported query parameters
 * for the `GET /messages` endpoint.
 */
export class ListMessagesQueryDto {
  /**
   * Target channel from which messages should be retrieved.
   *
   * Only predefined channel keys are allowed.
   */
  @IsIn(['general', 'support'])
  channel!: 'general' | 'support';

  /**
   * Optional pagination cursor.
   *
   * Represents the ID of the last message from the previous page.
   */
  @IsOptional()
  @IsString()
  cursor?: string;

  /**
   * Optional number of messages to return.
   *
   * Must be between 1 and 100 if provided.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
