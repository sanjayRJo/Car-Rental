
CREATE TYPE public.app_role AS ENUM ('customer','admin','super_admin','fleet_manager','support');
CREATE TYPE public.fuel_type AS ENUM ('petrol','diesel','electric','hybrid');
CREATE TYPE public.transmission_type AS ENUM ('manual','automatic');
CREATE TYPE public.car_type AS ENUM ('hatchback','sedan','suv','luxury','ev');
CREATE TYPE public.car_status AS ENUM ('available','maintenance','blocked','inactive');
CREATE TYPE public.block_kind AS ENUM ('maintenance','blocked');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','ready_for_pickup','customer_arrived','picked_up','active','return_requested','returned','inspection','completed','cancelled','no_show','expired');
CREATE TYPE public.payment_status AS ENUM ('payment_pending','payment_success','payment_failed','payment_refunded');
CREATE TYPE public.notification_channel AS ENUM ('email','whatsapp','sms','push');
CREATE TYPE public.notification_status AS ENUM ('pending','sent','delivered','failed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  license_number text,
  address text,
  emergency_contact text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('admin','super_admin','fleet_manager','support'));
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_exists boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.email,''),
          NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','super_admin')) INTO admin_exists;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN admin_exists THEN 'customer'::public.app_role ELSE 'admin'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  address text NOT NULL DEFAULT '',
  city text NOT NULL,
  state text NOT NULL DEFAULT 'Tamil Nadu',
  latitude numeric,
  longitude numeric,
  opening_time time NOT NULL DEFAULT '06:00',
  closing_time time NOT NULL DEFAULT '23:00',
  contact_number text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "locations public read" ON public.locations FOR SELECT USING (true);
CREATE POLICY "locations staff write" ON public.locations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_code text NOT NULL UNIQUE,
  registration_number text NOT NULL UNIQUE,
  brand text NOT NULL,
  model text NOT NULL,
  variant text,
  slug text NOT NULL UNIQUE,
  year int NOT NULL,
  color text,
  car_type public.car_type NOT NULL DEFAULT 'hatchback',
  fuel public.fuel_type NOT NULL DEFAULT 'petrol',
  transmission public.transmission_type NOT NULL DEFAULT 'manual',
  seats int NOT NULL DEFAULT 5,
  mileage numeric,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  images text[] NOT NULL DEFAULT '{}',
  hourly_rate numeric NOT NULL DEFAULT 0,
  daily_rate numeric NOT NULL DEFAULT 0,
  weekly_rate numeric NOT NULL DEFAULT 0,
  security_deposit numeric NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 4.6,
  bookings_count int NOT NULL DEFAULT 0,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status public.car_status NOT NULL DEFAULT 'available',
  insurance_expiry date,
  rc_expiry date,
  puc_expiry date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cars_location_idx ON public.cars(location_id);
CREATE INDEX cars_status_idx ON public.cars(status);
GRANT SELECT ON public.cars TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cars public read" ON public.cars FOR SELECT USING (true);
CREATE POLICY "cars staff write" ON public.cars FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER cars_updated BEFORE UPDATE ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.car_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  kind public.block_kind NOT NULL DEFAULT 'maintenance',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX car_blocks_car_idx ON public.car_blocks(car_id, starts_at, ends_at);
GRANT SELECT ON public.car_blocks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_blocks TO authenticated;
GRANT ALL ON public.car_blocks TO service_role;
ALTER TABLE public.car_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks public read" ON public.car_blocks FOR SELECT USING (true);
CREATE POLICY "blocks staff write" ON public.car_blocks FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
  pickup_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  drop_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  pickup_at timestamptz NOT NULL,
  drop_at timestamptz NOT NULL,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text NOT NULL DEFAULT '',
  license_number text,
  address text,
  emergency_contact text,
  base_amount numeric NOT NULL DEFAULT 0,
  insurance_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  security_deposit numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'payment_pending',
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT bookings_period_valid CHECK (drop_at > pickup_at)
);
CREATE INDEX bookings_car_idx ON public.bookings(car_id, pickup_at, drop_at);
CREATE INDEX bookings_user_idx ON public.bookings(user_id);
CREATE INDEX bookings_status_idx ON public.bookings(status);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bookings read" ON public.bookings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own bookings insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own bookings update" ON public.bookings FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE TRIGGER bookings_updated BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  status public.booking_status NOT NULL,
  changed_by uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.booking_status_history TO authenticated;
GRANT ALL ON public.booking_status_history TO service_role;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history read" ON public.booking_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "history insert" ON public.booking_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

CREATE TABLE public.booking_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'pickup',
  fuel_level int,
  odometer int,
  exterior_condition text,
  interior_condition text,
  damages text,
  photos text[] NOT NULL DEFAULT '{}',
  additional_charges numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.booking_inspections TO authenticated;
GRANT ALL ON public.booking_inspections TO service_role;
ALTER TABLE public.booking_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inspections read" ON public.booking_inspections FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND (b.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "inspections staff write" ON public.booking_inspections FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  channel public.notification_channel NOT NULL DEFAULT 'whatsapp',
  subject text,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_templates TO authenticated;
GRANT ALL ON public.notification_templates TO service_role;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates staff" ON public.notification_templates FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid,
  recipient text NOT NULL,
  channel public.notification_channel NOT NULL,
  template_code text NOT NULL,
  reminder_key text UNIQUE,
  body text NOT NULL DEFAULT '',
  status public.notification_status NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_booking_idx ON public.notifications(booking_id);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications read" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "notifications staff write" ON public.notifications FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL DEFAULT 'Customer',
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (is_published OR public.is_staff(auth.uid()));
CREATE POLICY "reviews own insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "reviews staff write" ON public.reviews FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit staff read" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "audit staff insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings read" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings staff write" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE VIEW public.availability_slots AS
  SELECT b.car_id, b.pickup_at AS starts_at, b.drop_at AS ends_at, 'booked'::text AS kind
  FROM public.bookings b
  WHERE b.status NOT IN ('cancelled','no_show','expired','completed')
  UNION ALL
  SELECT c.car_id, c.starts_at, c.ends_at, c.kind::text FROM public.car_blocks c;
GRANT SELECT ON public.availability_slots TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_booking(
  _car_id uuid, _pickup_at timestamptz, _drop_at timestamptz,
  _pickup_location_id uuid, _drop_location_id uuid,
  _customer_name text, _customer_email text, _customer_phone text,
  _license_number text, _address text, _emergency_contact text,
  _base numeric, _insurance numeric, _tax numeric, _discount numeric,
  _deposit numeric, _total numeric
) RETURNS public.bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking public.bookings; v_status public.car_status; v_number text; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF _drop_at <= _pickup_at THEN RAISE EXCEPTION 'INVALID_PERIOD'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_car_id::text, 0));
  SELECT status INTO v_status FROM public.cars WHERE id = _car_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'CAR_NOT_FOUND'; END IF;
  IF v_status <> 'available' THEN RAISE EXCEPTION 'CAR_NOT_AVAILABLE'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings b WHERE b.car_id = _car_id
      AND b.status NOT IN ('cancelled','no_show','expired','completed')
      AND b.pickup_at < _drop_at AND b.drop_at > _pickup_at
  ) OR EXISTS (
    SELECT 1 FROM public.car_blocks k WHERE k.car_id = _car_id
      AND k.starts_at < _drop_at AND k.ends_at > _pickup_at
  ) THEN RAISE EXCEPTION 'CAR_NOT_AVAILABLE'; END IF;

  v_number := 'CRB-' || to_char(now(),'YYYYMMDD') || '-' || lpad(((floor(random()*99999))::int)::text, 5, '0');

  INSERT INTO public.bookings (booking_number, user_id, car_id, pickup_location_id, drop_location_id,
    pickup_at, drop_at, customer_name, customer_email, customer_phone, license_number, address,
    emergency_contact, base_amount, insurance_amount, tax_amount, discount_amount, security_deposit,
    total_amount, status, payment_status)
  VALUES (v_number, v_uid, _car_id, _pickup_location_id, _drop_location_id, _pickup_at, _drop_at,
    _customer_name, _customer_email, _customer_phone, _license_number, _address, _emergency_contact,
    _base, _insurance, _tax, _discount, _deposit, _total, 'confirmed', 'payment_pending')
  RETURNING * INTO v_booking;

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
  VALUES (v_booking.id, 'confirmed', v_uid, 'Booking created');
  UPDATE public.cars SET bookings_count = bookings_count + 1 WHERE id = _car_id;
  RETURN v_booking;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,timestamptz,timestamptz,uuid,uuid,text,text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.extend_booking(_booking_id uuid, _new_drop_at timestamptz)
RETURNS public.bookings LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.bookings; v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'BOOKING_NOT_FOUND'; END IF;
  IF v.user_id <> v_uid AND NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _new_drop_at <= v.drop_at THEN RAISE EXCEPTION 'INVALID_PERIOD'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v.car_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.car_id = v.car_id AND b.id <> v.id
      AND b.status NOT IN ('cancelled','no_show','expired','completed')
      AND b.pickup_at < _new_drop_at AND b.drop_at > v.pickup_at)
    OR EXISTS (SELECT 1 FROM public.car_blocks k WHERE k.car_id = v.car_id
      AND k.starts_at < _new_drop_at AND k.ends_at > v.drop_at)
  THEN RAISE EXCEPTION 'CAR_NOT_AVAILABLE'; END IF;
  UPDATE public.bookings SET drop_at = _new_drop_at WHERE id = v.id RETURNING * INTO v;
  INSERT INTO public.booking_status_history (booking_id, status, changed_by, note)
  VALUES (v.id, v.status, v_uid, 'Booking extended');
  RETURN v;
END; $$;
GRANT EXECUTE ON FUNCTION public.extend_booking(uuid, timestamptz) TO authenticated;

INSERT INTO public.locations (name, slug, address, city, latitude, longitude, contact_number) VALUES
 ('Chennai Airport','chennai-airport','GST Road, Meenambakkam','Chennai',12.9941,80.1709,'+91 90000 11001'),
 ('Chennai Central','chennai-central','EVR Periyar Salai, Park Town','Chennai',13.0827,80.2757,'+91 90000 11002'),
 ('Thanjavur City','thanjavur','South Rampart, Thanjavur','Thanjavur',10.7870,79.1378,'+91 90000 11003'),
 ('Coimbatore Airport','coimbatore-airport','Avinashi Road, Peelamedu','Coimbatore',11.0301,77.0434,'+91 90000 11004'),
 ('Trichy Airport','trichy-airport','Airport Road, Tiruchirappalli','Trichy',10.7654,78.7097,'+91 90000 11005'),
 ('Madurai City','madurai','Alagarkoil Road, Madurai','Madurai',9.9252,78.1198,'+91 90000 11006');

INSERT INTO public.cars (vehicle_code, registration_number, brand, model, variant, slug, year, color, car_type, fuel, transmission, seats, mileage, description, features, hourly_rate, daily_rate, weekly_rate, security_deposit, rating, location_id, insurance_expiry, rc_expiry, puc_expiry)
SELECT v.vehicle_code, v.registration_number, v.brand, v.model, v.variant, v.slug, v.year, v.color,
       v.car_type, v.fuel, v.transmission, v.seats, v.mileage, v.description, v.features,
       v.hourly_rate, v.daily_rate, v.weekly_rate, v.security_deposit, v.rating, loc.id,
       v.insurance_expiry, v.rc_expiry, v.puc_expiry
FROM (VALUES
 ('CAR-000101','TN 49 AB 1234','Toyota','Fortuner','4x2 AT','toyota-fortuner-tn49ab1234',2023,'Pearl White','suv'::public.car_type,'diesel'::public.fuel_type,'automatic'::public.transmission_type,7,12.4,'Commanding 7-seat SUV built for long highway runs and hill drives.',ARRAY['Bluetooth','Android Auto','Apple CarPlay','Reverse Camera','Air Conditioning','GPS','USB Charging'],349,2499,14990,10000,4.8,'chennai-airport','2027-03-31'::date,'2033-06-30'::date,'2026-11-30'::date),
 ('CAR-000102','TN 49 AB 5678','Toyota','Fortuner','Legender','toyota-fortuner-tn49ab5678',2024,'Midnight Black','suv','diesel','automatic',7,12.1,'Top-trim Fortuner with premium interiors.',ARRAY['Bluetooth','Ventilated Seats','Apple CarPlay','360 Camera','Air Conditioning','GPS'],369,2699,16190,10000,4.9,'chennai-airport','2027-05-31','2034-01-31','2026-12-31'),
 ('CAR-000103','TN 49 AC 2222','Hyundai','Creta','SX Turbo','hyundai-creta-tn49ac2222',2023,'Titan Grey','suv','petrol','automatic',5,16.8,'Comfortable compact SUV for city and weekend trips.',ARRAY['Bluetooth','Sunroof','Apple CarPlay','Reverse Camera','Air Conditioning','USB Charging'],199,1599,9590,6000,4.7,'chennai-central','2027-01-31','2033-04-30','2026-10-31'),
 ('CAR-000104','TN 50 AC 3333','Tata','Nexon','EV Max','tata-nexon-ev-tn50ac3333',2024,'Teal Blue','ev','electric','automatic',5,320,'All-electric compact SUV with 300+ km real range.',ARRAY['Bluetooth','Fast Charging','Apple CarPlay','Reverse Camera','Air Conditioning','GPS'],179,1499,8990,5000,4.6,'chennai-central','2027-08-31','2034-03-31','2027-01-31'),
 ('CAR-000105','TN 50 AD 8911','Maruti Suzuki','Swift','ZXi','maruti-swift-tn50ad8911',2022,'Fire Red','hatchback','petrol','manual',5,22.4,'Nippy hatchback that is easy to park and cheap to run.',ARRAY['Bluetooth','Reverse Camera','Air Conditioning','USB Charging'],99,1099,6590,3000,4.5,'thanjavur','2026-12-31','2032-09-30','2026-09-30'),
 ('CAR-000106','TN 45 BB 7712','Maruti Suzuki','Baleno','Alpha AMT','maruti-baleno-tn45bb7712',2023,'Silver','hatchback','petrol','automatic',5,21.1,'Roomy premium hatchback with automatic gearbox.',ARRAY['Bluetooth','Apple CarPlay','Reverse Camera','Air Conditioning'],109,1199,7190,3000,4.4,'thanjavur','2027-02-28','2033-02-28','2026-11-30'),
 ('CAR-000107','TN 37 CD 4501','Kia','Seltos','HTX','kia-seltos-tn37cd4501',2024,'Gravity Grey','suv','petrol','automatic',5,16.5,'Feature-loaded SUV with a panoramic sunroof.',ARRAY['Bluetooth','Sunroof','Apple CarPlay','Ventilated Seats','Air Conditioning','GPS'],209,1699,10190,6000,4.7,'coimbatore-airport','2027-06-30','2034-02-28','2026-12-31'),
 ('CAR-000108','TN 37 CE 9090','Mahindra','Scorpio-N','Z8L','mahindra-scorpio-n-tn37ce9090',2024,'Napoli Black','suv','diesel','manual',7,14.2,'Rugged 7-seater with a serious road presence.',ARRAY['Bluetooth','Apple CarPlay','Reverse Camera','Air Conditioning','GPS','USB Charging'],239,1899,11390,8000,4.6,'coimbatore-airport','2027-07-31','2034-04-30','2027-02-28'),
 ('CAR-000109','TN 45 EF 1001','Honda','City','VX CVT','honda-city-tn45ef1001',2023,'Platinum White','sedan','petrol','automatic',5,18.4,'Refined sedan, perfect for business travel.',ARRAY['Bluetooth','Sunroof','Apple CarPlay','Reverse Camera','Air Conditioning'],169,1399,8390,5000,4.7,'trichy-airport','2027-04-30','2033-08-31','2026-10-31'),
 ('CAR-000110','TN 45 EG 5511','Hyundai','Verna','SX Turbo','hyundai-verna-tn45eg5511',2024,'Fiery Red','sedan','petrol','automatic',5,18.0,'Sporty sedan with an eager turbo engine.',ARRAY['Bluetooth','Ventilated Seats','Apple CarPlay','360 Camera','Air Conditioning'],179,1499,8990,5000,4.6,'trichy-airport','2027-09-30','2034-05-31','2027-03-31'),
 ('CAR-000111','TN 59 GH 3300','Tata','Punch','Creative','tata-punch-tn59gh3300',2023,'Atomic Orange','hatchback','petrol','manual',5,20.1,'Tall-boy micro SUV that shrugs off bad roads.',ARRAY['Bluetooth','Reverse Camera','Air Conditioning','USB Charging'],99,1049,6290,3000,4.4,'madurai','2027-03-31','2033-05-31','2026-08-31'),
 ('CAR-000112','TN 59 GJ 7788','BMW','3 Series','330i M Sport','bmw-3-series-tn59gj7788',2023,'Portimao Blue','luxury','petrol','automatic',5,13.0,'Executive luxury sedan for occasions that matter.',ARRAY['Bluetooth','Sunroof','Apple CarPlay','Ventilated Seats','360 Camera','GPS'],699,5499,32990,25000,4.9,'madurai','2027-10-31','2034-06-30','2027-04-30')
) AS v(vehicle_code, registration_number, brand, model, variant, slug, year, color, car_type, fuel, transmission, seats, mileage, description, features, hourly_rate, daily_rate, weekly_rate, security_deposit, rating, loc_slug, insurance_expiry, rc_expiry, puc_expiry)
JOIN public.locations loc ON loc.slug = v.loc_slug;

INSERT INTO public.bookings (booking_number, car_id, pickup_location_id, drop_location_id, pickup_at, drop_at, customer_name, customer_email, customer_phone, base_amount, insurance_amount, tax_amount, security_deposit, total_amount, status, payment_status)
SELECT 'CRB-DEMO-' || lpad((row_number() OVER ())::text, 4, '0'),
       c.id, c.location_id, c.location_id, s.pickup_at, s.drop_at,
       s.name, s.email, s.phone,
       c.daily_rate * 2, 300, ROUND(c.daily_rate * 0.18), c.security_deposit,
       c.daily_rate * 2 + 300 + ROUND(c.daily_rate * 0.18),
       s.status::public.booking_status, 'payment_success'
FROM (VALUES
 ('toyota-fortuner-tn49ab1234', now()+interval '2 day', now()+interval '4 day','Arun Kumar','arun@example.com','+91 98400 10001','confirmed'),
 ('toyota-fortuner-tn49ab5678', now()+interval '1 day', now()+interval '3 day','Divya R','divya@example.com','+91 98400 10002','confirmed'),
 ('hyundai-creta-tn49ac2222', now()+interval '5 day', now()+interval '7 day','Karthik S','karthik@example.com','+91 98400 10003','confirmed'),
 ('tata-nexon-ev-tn50ac3333', now()-interval '1 day', now()+interval '1 day','Meena V','meena@example.com','+91 98400 10004','active'),
 ('maruti-swift-tn50ad8911', now()+interval '3 day', now()+interval '5 day','Rahul P','rahul@example.com','+91 98400 10005','confirmed'),
 ('kia-seltos-tn37cd4501', now()+interval '2 day', now()+interval '3 day','Sneha M','sneha@example.com','+91 98400 10006','confirmed'),
 ('honda-city-tn45ef1001', now()+interval '6 day', now()+interval '9 day','Vijay A','vijay@example.com','+91 98400 10007','confirmed'),
 ('bmw-3-series-tn59gj7788', now()+interval '4 day', now()+interval '6 day','Priya N','priya@example.com','+91 98400 10008','confirmed')
) AS s(slug, pickup_at, drop_at, name, email, phone, status)
JOIN public.cars c ON c.slug = s.slug;

INSERT INTO public.car_blocks (car_id, kind, starts_at, ends_at, reason)
SELECT id, 'maintenance', now()+interval '3 day', now()+interval '5 day', 'Scheduled service'
FROM public.cars WHERE slug = 'mahindra-scorpio-n-tn37ce9090';

INSERT INTO public.system_settings (key, value, description) VALUES
 ('reminders', '{"pickup":{"24h":true,"6h":true,"2h":true},"active":{"2h":true,"4h":true,"daily":true},"drop":{"24h":true,"6h":true,"4h":true,"2h":true},"channels":{"email":true,"whatsapp":true}}', 'Reminder schedule and channel toggles'),
 ('cancellation', '{"freeUntilHours":24,"lateFeePercent":25,"afterPickupRefund":0}', 'Cancellation rules'),
 ('pricing', '{"taxPercent":18,"insurancePerDay":150,"lateFeePerHour":250,"extraKmCharge":12}', 'Pricing engine defaults');

INSERT INTO public.notification_templates (code, channel, subject, body) VALUES
 ('BOOKING_CONFIRMED','whatsapp','Booking confirmed','Your booking {{booking_number}} for {{car}} is confirmed. Pickup {{pickup}} at {{location}}.'),
 ('BOOKING_CONFIRMED_EMAIL','email','Your booking is confirmed','Hi {{name}}, your booking {{booking_number}} for {{car}} is confirmed. Pickup {{pickup}} at {{location}}.'),
 ('PICKUP_REMINDER','whatsapp','Pickup reminder','Your car rental pickup is approaching. Booking {{booking_number}}, {{car}}, pickup {{pickup}} at {{location}}. Please carry your documents.'),
 ('RENTAL_ACTIVE','whatsapp','Rental active','Your rental is active. {{car}}, booking {{booking_number}}. Drop-off {{drop}}.'),
 ('DROP_REMINDER','whatsapp','Drop-off reminder','Your drop-off is approaching. {{car}} must be returned by {{drop}} at {{location}}. Late charges may apply.'),
 ('BOOKING_CANCELLED','whatsapp','Booking cancelled','Booking {{booking_number}} has been cancelled. Any eligible refund will be processed shortly.'),
 ('RETURN_COMPLETED','whatsapp','Return complete','Thanks for driving with us. Booking {{booking_number}} is now complete.');

INSERT INTO public.reviews (car_id, author_name, rating, comment)
SELECT id, 'Verified renter', 5, 'Spotless car, smooth handover, exactly as listed.' FROM public.cars WHERE slug='toyota-fortuner-tn49ab1234';
INSERT INTO public.reviews (car_id, author_name, rating, comment)
SELECT id, 'Verified renter', 5, 'Great mileage and the pickup took under ten minutes.' FROM public.cars WHERE slug='hyundai-creta-tn49ac2222';

