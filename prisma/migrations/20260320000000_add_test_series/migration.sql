-- CreateTable
CREATE TABLE "test_series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "exam_mode" TEXT NOT NULL,
    "subject" TEXT,
    "difficulty" TEXT NOT NULL,
    "total_tests" INTEGER NOT NULL,
    "questions_per_test" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_series_enrollments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "tests_completed" INTEGER NOT NULL DEFAULT 0,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_series_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_series_enrollments_user_id_series_id_key" ON "user_series_enrollments"("user_id", "series_id");

-- AddForeignKey
ALTER TABLE "user_series_enrollments" ADD CONSTRAINT "user_series_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_series_enrollments" ADD CONSTRAINT "user_series_enrollments_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "test_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
