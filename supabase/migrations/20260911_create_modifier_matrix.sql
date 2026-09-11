-- 1. Modifier Groups table
CREATE TABLE IF NOT EXISTS public.modifier_groups (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_name TEXT NOT NULL,
    description TEXT,
    status SMALLINT DEFAULT 1, -- 1: Active, 0: Inactive
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Base Items table (original items in the group)
CREATE TABLE IF NOT EXISTS public.modifier_group_base_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_modifier_group_base_item UNIQUE (group_id, item_id)
);

-- 3. Target Items table (trade-up items with surcharge price)
CREATE TABLE IF NOT EXISTS public.modifier_group_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    surcharge_price NUMERIC(12,2) NOT NULL DEFAULT 0, -- Surcharge amount
    is_active BOOLEAN DEFAULT TRUE,                   -- True: Active, False: Off
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_modifier_group_target_item UNIQUE (group_id, item_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_mod_base_item_group ON public.modifier_group_base_items(group_id, item_id);
CREATE INDEX IF NOT EXISTS idx_mod_target_item_group ON public.modifier_group_items(group_id, item_id);

-- Row Level Security (RLS)
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON public.modifier_groups;
CREATE POLICY "allow all" ON public.modifier_groups FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.modifier_group_base_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON public.modifier_group_base_items;
CREATE POLICY "allow all" ON public.modifier_group_base_items FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.modifier_group_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow all" ON public.modifier_group_items;
CREATE POLICY "allow all" ON public.modifier_group_items FOR ALL TO public USING (true) WITH CHECK (true);
