-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ChannelKey" AS ENUM ('general', 'support');

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "channelKey" "ChannelKey" NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" "Role" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_channelKey_createdAt_idx" ON "Message"("channelKey", "createdAt");
