CREATE OR REPLACE FUNCTION public.redeem_activation_code(_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _device_id text;
  _row public.activation_codes%ROWTYPE;
  _current_expiry timestamptz;
  _new_expiry timestamptz;
  _normalized_code text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Compute caller's device_id the same way the UI does (lowercase hex, 16 chars)
  _device_id := lower(substr(replace(_uid::text, '-', ''), 1, 16));

  -- Normalize the code: trim, uppercase
  _normalized_code := upper(trim(_code));

  SELECT * INTO _row FROM public.activation_codes
   WHERE upper(trim(code)) = _normalized_code
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_not_found');
  END IF;

  IF _row.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'code_already_used');
  END IF;

  -- Strict device match (case-insensitive)
  IF _row.device_id IS NOT NULL AND lower(trim(_row.device_id)) <> _device_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'device_mismatch');
  END IF;

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

  -- Log redemption in audit
  INSERT INTO public.subscription_audit_log (target_user_id, changed_by, action, old_value, new_value, notes)
  VALUES (
    _uid, _uid, 'code_redeemed',
    jsonb_build_object('expires_at', _current_expiry),
    jsonb_build_object('expires_at', _new_expiry, 'is_permanent', _row.is_permanent, 'code', _row.code),
    'تفعيل عبر مفتاح من لوحة المسؤول'
  );

  RETURN jsonb_build_object(
    'success', true,
    'expires_at', _new_expiry,
    'is_permanent', _row.is_permanent
  );
END;
$function$;