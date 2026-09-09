-- CreateTable
CREATE TABLE "Floor" (
    "floor_id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "floor_number" INTEGER NOT NULL,
    "is_full_lab_floor" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("floor_id")
);

-- CreateTable
CREATE TABLE "Side" (
    "side_id" SERIAL NOT NULL,
    "floor_id" INTEGER NOT NULL,
    "side_code" TEXT NOT NULL,

    CONSTRAINT "Side_pkey" PRIMARY KEY ("side_id")
);

-- CreateTable
CREATE TABLE "Room" (
    "room_id" SERIAL NOT NULL,
    "side_id" INTEGER NOT NULL,
    "room_code" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "room_type" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "Module" (
    "module_id" SERIAL NOT NULL,
    "module_code" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("module_id")
);

-- CreateTable
CREATE TABLE "Lecturer" (
    "lecturer_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "Lecturer_pkey" PRIMARY KEY ("lecturer_id")
);

-- CreateTable
CREATE TABLE "DisplayDevice" (
    "display_id" SERIAL NOT NULL,
    "device_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "side_id" INTEGER NOT NULL,

    CONSTRAINT "DisplayDevice_pkey" PRIMARY KEY ("display_id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "admin_id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "Session" (
    "session_id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "module_id" INTEGER NOT NULL,
    "lecturer_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "session_date" TIMESTAMP(3) NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "session_type" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "SessionChange" (
    "change_id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "changed_by" INTEGER NOT NULL,
    "change_type" TEXT NOT NULL,
    "reason" TEXT,
    "new_date" TIMESTAMP(3),
    "new_start_time" TIMESTAMP(3),
    "new_end_time" TIMESTAMP(3),
    "new_room_id" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionChange_pkey" PRIMARY KEY ("change_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Module_module_code_key" ON "Module"("module_code");

-- CreateIndex
CREATE UNIQUE INDEX "Lecturer_email_key" ON "Lecturer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DisplayDevice_side_id_key" ON "DisplayDevice"("side_id");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "Building"("building_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Side" ADD CONSTRAINT "Side_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "Floor"("floor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_side_id_fkey" FOREIGN KEY ("side_id") REFERENCES "Side"("side_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisplayDevice" ADD CONSTRAINT "DisplayDevice_side_id_fkey" FOREIGN KEY ("side_id") REFERENCES "Side"("side_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "Module"("module_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_lecturer_id_fkey" FOREIGN KEY ("lecturer_id") REFERENCES "Lecturer"("lecturer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChange" ADD CONSTRAINT "SessionChange_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("session_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionChange" ADD CONSTRAINT "SessionChange_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "Admin"("admin_id") ON DELETE RESTRICT ON UPDATE CASCADE;
