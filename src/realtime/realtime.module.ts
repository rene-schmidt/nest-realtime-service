import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
