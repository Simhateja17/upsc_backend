alter table "editorials"
  add column if not exists "primary_syllabus_path" jsonb,
  add column if not exists "secondary_syllabus_paths" jsonb,
  add column if not exists "syllabus_mapping_source" text,
  add column if not exists "syllabus_mapping_overridden" boolean not null default false;
