
DROP VIEW IF EXISTS public.availability_slots;

CREATE OR REPLACE FUNCTION public.get_busy_slots(_from timestamptz, _to timestamptz)
RETURNS TABLE (car_id uuid, starts_at timestamptz, ends_at timestamptz, kind text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.car_id, b.pickup_at, b.drop_at, 'booked'::text
  FROM public.bookings b
  WHERE b.status NOT IN ('cancelled','no_show','expired','completed')
    AND b.pickup_at < _to AND b.drop_at > _from
  UNION ALL
  SELECT k.car_id, k.starts_at, k.ends_at, k.kind::text
  FROM public.car_blocks k
  WHERE k.starts_at < _to AND k.ends_at > _from;
$$;
REVOKE ALL ON FUNCTION public.get_busy_slots(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_busy_slots(timestamptz, timestamptz) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_booking(uuid,timestamptz,timestamptz,uuid,uuid,text,text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid,timestamptz,timestamptz,uuid,uuid,text,text,text,text,text,text,numeric,numeric,numeric,numeric,numeric,numeric) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.extend_booking(uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_booking(uuid, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
