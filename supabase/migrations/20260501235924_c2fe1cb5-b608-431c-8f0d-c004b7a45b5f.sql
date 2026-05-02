-- Add device_id and permanent flag to activation_codes
ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS is_permanent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_activation_codes_device_id ON public.activation_codes(device_id);
CREATE INDEX IF NOT EXISTS idx_activation_codes_code ON public.activation_codes(code);

-- Function: redeem an activation code for the current user
-- Validates: code exists, not used, device_id matches caller's device_id (first 16 hex chars of user_id)
-- Effect: marks code as used, extends profile.subscription_expires_at, sets is_active=true
CREATE OR REPLACE FUNCTION public.redeem_activation_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _device_id text;
  _row public.activation_codes%ROWTYPE;
  _current_expiry timestamptz;
  _new_expiry timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Compute caller's device_id the same way the UI does
  _device_id := substr(replace(_uid::text, '-', ''), 1, 16);

  SELECT * INTO _row FROM public.activation_codes
   WHERE code = upper(trim(_code))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
  END IF;

  IF _row.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_already_used');
  END IF;

  IF _row.device_id IS NOT NULL AND _row.device_id <> _device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'device_mismatch');
  END IF;

  -- Compute new expiry
  SELECT subscription_expires_at INTO _current_expiry FROM public.profiles WHERE id = _uid;

  IF _row.is_permanent THEN
    _new_expiry := now() + INTERVAL '100 years';
  ELSE
    _new_expiry := GREATEST(COALESCE(_current_expiry, now()), now())
                   + make_interval(days => _row.duration_days);
  END IF;

  UPDATE public.profiles
     SET subscription_expires_at = _new_expiry,
         subscription_status = CASE WHEN _row.is_permanent THEN 'permanent' ELSE 'active' END,
         is_active = true,
         updated_at = now()
   WHERE id = _uid;

  UPDATE public.activation_codes
     SET is_used = true,
         used_at = now(),
         user_id = _uid,
         device_id = COALESCE(device_id, _device_id)
   WHERE id = _row.id;

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', _new_expiry,
    'is_permanent', _row.is_permanent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;
