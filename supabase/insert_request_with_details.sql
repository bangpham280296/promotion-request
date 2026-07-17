-- ============================================================
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- PURPOSE: Wrap "requests" + "promotiondetail" (+ "discount_metadata"
--          for Discount-type rows) inserts inside a single PostgreSQL
--          transaction so either ALL succeed (COMMIT) or NONE are
--          saved (ROLLBACK).
-- ORDERING: Run discount_metadata.sql BEFORE this file — this
--          function body references the "discount_metadata" table.
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
  d             JSONB;
  v_reqdtlid    INTEGER;
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

  -- 2. Insert each detail row, one at a time (need each reqdtlid back
  --    to link discount_metadata) — if any step fails, PostgreSQL
  --    auto-rolls back everything above as well.
  FOR d IN SELECT * FROM jsonb_array_elements(p_details)
  LOOP
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
    VALUES (
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
    )
    RETURNING reqdtlid INTO v_reqdtlid;

    IF d ? 'metadata' AND jsonb_typeof(d->'metadata') = 'object' THEN
      INSERT INTO discount_metadata (reqdtlid, metadata)
      VALUES (v_reqdtlid, d->'metadata');
    END IF;
  END LOOP;

  -- 3. Return reqid + requestcode to the caller
  RETURN jsonb_build_object(
    'reqid',       v_reqid,
    'requestcode', v_requestcode
  );
END;
$$;
