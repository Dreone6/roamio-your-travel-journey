
-- Add new enum values
ALTER TYPE public.checklist_category ADD VALUE IF NOT EXISTS 'documents';
ALTER TYPE public.checklist_category ADD VALUE IF NOT EXISTS 'pre_trip_tasks';
ALTER TYPE public.checklist_category ADD VALUE IF NOT EXISTS 'day_of';

-- Add reminder toggle
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS reminder BOOLEAN NOT NULL DEFAULT false;
