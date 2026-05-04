
-- Enums
CREATE TYPE public.trip_status AS ENUM ('planning', 'active', 'completed');
CREATE TYPE public.trip_style AS ENUM ('solo', 'couple', 'family', 'friends', 'business');
CREATE TYPE public.itinerary_type AS ENUM ('food', 'activity', 'transport', 'lodging');
CREATE TYPE public.challenge_status AS ENUM ('active', 'completed', 'expired');
CREATE TYPE public.checklist_category AS ENUM ('packing', 'booking', 'documents', 'other');
CREATE TYPE public.offer_category AS ENUM ('food', 'activity', 'lodging', 'transport', 'shopping', 'other');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  profile_photo TEXT,
  home_city TEXT,
  bio TEXT,
  member_since TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_countries_visited INT NOT NULL DEFAULT 0,
  total_cities_visited INT NOT NULL DEFAULT 0,
  total_trips INT NOT NULL DEFAULT 0,
  travel_style TEXT,
  interests TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  trip_style public.trip_style,
  status public.trip_status NOT NULL DEFAULT 'planning',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own trips" ON public.trips FOR ALL USING (auth.uid() = user_id);

-- Places visited
CREATE TABLE public.places_visited (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country TEXT NOT NULL,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  date_visited DATE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  photos_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.places_visited ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own places" ON public.places_visited FOR ALL USING (auth.uid() = user_id);

-- Checklists
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category public.checklist_category NOT NULL DEFAULT 'other',
  completed BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own checklists" ON public.checklists FOR ALL USING (auth.uid() = user_id);

-- Check-ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own check_ins" ON public.check_ins FOR ALL USING (auth.uid() = user_id);

-- Itinerary items
CREATE TABLE public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_number INT NOT NULL,
  time TIME,
  activity TEXT NOT NULL,
  location TEXT,
  notes TEXT,
  type public.itinerary_type NOT NULL DEFAULT 'activity',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own itinerary" ON public.itinerary_items FOR ALL USING (auth.uid() = user_id);

-- Partner offers
CREATE TABLE public.partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  category public.offer_category NOT NULL DEFAULT 'other',
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  offer_description TEXT NOT NULL,
  discount TEXT,
  image TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active offers" ON public.partner_offers FOR SELECT USING (active = true);

-- Challenges
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  location TEXT,
  challenge_text TEXT NOT NULL,
  status public.challenge_status NOT NULL DEFAULT 'active',
  reward_badge TEXT,
  completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own challenges" ON public.challenges FOR ALL USING (auth.uid() = user_id);

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_name TEXT NOT NULL,
  badge_image TEXT,
  earned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own badges" ON public.badges FOR ALL USING (auth.uid() = user_id);
