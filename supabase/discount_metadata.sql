-- supabase/discount_metadata.sql
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- PURPOSE: 1-1 table storing full Voucherify campaign metadata per Discount-type
--          promotiondetail row (JSONB — schema is account-configured and can change
--          without a DB migration). See docs/superpowers/specs/2026-07-17-discount-metadata-design.md

CREATE TABLE discount_metadata (
  reqdtlid  INTEGER PRIMARY KEY
            REFERENCES promotiondetail(reqdtlid) ON DELETE CASCADE,
  metadata  JSONB NOT NULL DEFAULT '{}'::jsonb,
  updateat  TIMESTAMPTZ,

  CONSTRAINT discount_metadata_is_object
    CHECK (jsonb_typeof(metadata) = 'object')
);

ALTER TABLE discount_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY discount_metadata_select ON discount_metadata
  FOR SELECT TO authenticated USING (true);
CREATE POLICY discount_metadata_insert ON discount_metadata
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY discount_metadata_update ON discount_metadata
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY discount_metadata_delete ON discount_metadata
  FOR DELETE TO authenticated USING (true);

-- Audit trail: snapshot of the exact metadata object sent to Voucherify on each push
ALTER TABLE voucherify_pushes ADD COLUMN metadata_sent JSONB;
