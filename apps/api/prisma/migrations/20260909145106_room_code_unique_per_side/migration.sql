/*
  Warnings:

  - A unique constraint covering the columns `[side_id,room_code]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Room_side_id_room_code_key" ON "Room"("side_id", "room_code");
