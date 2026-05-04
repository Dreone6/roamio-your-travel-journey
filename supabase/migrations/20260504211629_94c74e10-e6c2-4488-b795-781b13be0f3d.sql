
-- Add new columns to trips
ALTER TABLE public.trips
  ADD COLUMN travelers INT NOT NULL DEFAULT 1,
  ADD COLUMN pace TEXT,
  ADD COLUMN dietary TEXT,
  ADD COLUMN interests TEXT[] DEFAULT '{}';

-- Add new columns to itinerary_items
ALTER TABLE public.itinerary_items
  ADD COLUMN estimated_cost NUMERIC,
  ADD COLUMN description TEXT,
  ADD COLUMN time_block TEXT;
