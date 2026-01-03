import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './messages/messages.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, MessagesModule, RealtimeModule, AuthModule],
})
export class AppModule {}
