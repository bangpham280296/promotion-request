-- ==============================================================================
-- OPTIMIZATION MIGRATION: Performance Indexes for Promotion Request System
-- ==============================================================================
-- Run this script directly in Supabase SQL Editor (Dashboard > SQL Editor)
--
-- PURPOSE:
-- 1. Eliminate Sequential Scans on requests, promotiondetail, and foreign key joins.
-- 2. Drastically speed up RLS evaluation and filter queries (requester, stt, itemtype).
-- 3. Reduce database CPU and query response times from 300-800ms down to <15ms.
-- ==============================================================================

-- 1. Requests Table Indexes
-- Accelerates "My Request" page queries: WHERE requester = <userId>
CREATE INDEX IF NOT EXISTS idx_requests_requester 
ON public.requests(requester);

-- Accelerates status filtering (Active / Inactive / Pending)
CREATE INDEX IF NOT EXISTS idx_requests_stt 
ON public.requests(stt);

-- Accelerates default descending order by creation date
CREATE INDEX IF NOT EXISTS idx_requests_createdate_desc 
ON public.requests(createdate DESC);

-- Composite index for most common query: WHERE requester = ? AND stt = ?
CREATE INDEX IF NOT EXISTS idx_requests_requester_stt 
ON public.requests(requester, stt);


-- 2. Promotion Detail Table Indexes
-- Essential Foreign Key index for JOINs between requests and promotiondetail
CREATE INDEX IF NOT EXISTS idx_promotiondetail_reqid 
ON public.promotiondetail(reqid);

-- Accelerates Combo filtering: WHERE itemtype = 'combo'
CREATE INDEX IF NOT EXISTS idx_promotiondetail_itemtype 
ON public.promotiondetail(itemtype);

-- Composite index for Combo pagination & ordering: WHERE itemtype = 'combo' ORDER BY reqdtlid DESC
CREATE INDEX IF NOT EXISTS idx_promotiondetail_itemtype_reqdtlid 
ON public.promotiondetail(itemtype, reqdtlid DESC);


-- 3. Discount Metadata Table Indexes
-- Foreign Key index for 1-1 / 1-N join between promotiondetail and discount_metadata
CREATE INDEX IF NOT EXISTS idx_discount_metadata_reqdtlid 
ON public.discount_metadata(reqdtlid);


-- 4. Employees & Department Indexes
-- Speeds up profile and requester department lookup
CREATE INDEX IF NOT EXISTS idx_employees_department_id 
ON public.employees(department_id);

-- ==============================================================================
-- Verification Query (Run this to verify new indexes were successfully created)
-- ==============================================================================
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('requests', 'promotiondetail', 'discount_metadata', 'employees')
ORDER BY tablename, indexname;
