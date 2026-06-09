-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- PURPOSE: Wrap "requests" + "promotiondetail" inserts inside
--          a single PostgreSQL transaction so either BOTH
--          succeed (COMMIT) or NEITHER is saved (ROLLBACK).
-- ============================================================

CREATE OR REPLACE FUNCTION insert_request_with_details(
  p_req     JSONB,
  p_details JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reqid       INTEGER;
  v_requestcode TEXT;
BEGIN
  -- 1. Insert request header
  INSERT INTO requests (
    promotionname,
    startdate,
    enddate,
    createdate,
    department,
    requester,
    stt
  )
  VALUES (
    p_req->>'promotionname',
    (p_req->>'startdate')::date,
    (p_req->>'enddate')::date,
    (p_req->>'createdate')::timestamptz,
    (p_req->>'department')::integer,
    (p_req->>'requester')::uuid,
    (p_req->>'stt')::integer
  )
  RETURNING reqid, requestcode INTO v_reqid, v_requestcode;

  -- 2. Insert all detail rows
  --    If this fails → PostgreSQL auto-rolls back step 1 as well
  INSERT INTO promotiondetail (
    reqid,
    itemcode,
    itemname,
    description,
    discount,
    price,
    startdate,
    enddate,
    servicetype,
    notes,
    itemtype
  )
  SELECT
    v_reqid,
    d->>'itemcode',
    d->>'itemname',
    d->>'description',
    d->>'discount',
    (NULLIF(d->>'price',       ''))::numeric,
    (NULLIF(d->>'startdate',   ''))::date,
    (NULLIF(d->>'enddate',     ''))::date,
    NULLIF(d->>'servicetype',  ''),
    NULLIF(d->>'notes',        ''),
    NULLIF(d->>'itemtype',     '')
  FROM jsonb_array_elements(p_details) AS d;

  -- 3. Return reqid + requestcode to the caller
  RETURN jsonb_build_object(
    'reqid',       v_reqid,
    'requestcode', v_requestcode
  );
END;
$$;
