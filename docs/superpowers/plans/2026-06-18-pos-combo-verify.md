# POS Combo Verify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only "Verify POS" button to ComboTable and RequestViewModal that compares combo records in `promotiondetail` against the POS REST API and displays match/mismatch status per row.

**Architecture:** A new Next.js API route (`POST /api/combos/pos-verify`) handles the server-side fetch of POS data and comparison logic, returning verdicts keyed by `reqdtlid`. A shared `usePOSVerify` hook manages client-side state (loading, results, error). Two existing components are extended to consume this hook.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Supabase SSR (for admin auth check), TailwindCSS, existing `Badge` and `Table` components.

## Global Constraints

- Admin check: use `createSupabaseServerClient()` from `src/lib/supabase/server.ts` → `supabase.auth.getUser()`, then query `employees.role` via `supabaseAdmin`
- `startdate` is displayed only — never included in comparison logic
- Match requires: `proname.trim() === itemname.trim()`, `enddate` normalized to `YYYY-MM-DD` must match, `active === 'Y'`
- `reqdtlid` is the unique key for mapping results — never use `itemcode` alone
- `POS_COMBO_API_URL` must be set in `.env.local`
- POS API returns: `Array<{ proid: string, proname: string, startdate: string | null, enddate: string | null, active: 'Y' | 'N' }>`
- Follow existing Tailwind class patterns from `ComboTable.tsx` and `RequestViewModal.tsx`
- No new npm packages

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/app/api/combos/pos-verify/route.ts` | POST handler: auth check, POS fetch, comparison |
| Create | `src/hooks/usePOSVerify.ts` | Client hook: loading/results/error state, calls API |
| Modify | `src/components/(product)/combo/ComboTable.tsx` | Add Verify button, summary bar, POS Status column + inline diff |
| Modify | `src/components/history-request/RequestViewModal.tsx` | Add Verify button, POS Status column (combo rows only) + timestamp |

---

## Task 1: API Route — `POST /api/combos/pos-verify`

**Files:**
- Create: `src/app/api/combos/pos-verify/route.ts`

**Interfaces:**
- Consumes: `src/lib/supabase/server.ts` → `createSupabaseServerClient()`
- Consumes: `src/lib/supabase/supabaseAdmin.ts` → `supabaseAdmin`
- Produces: `POST /api/combos/pos-verify` → `{ results: VerifyResult[], verifiedAt: string }`

- [ ] **Step 1: Create the route file with all types and logic**

```typescript
// src/app/api/combos/pos-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";

type ComboInput = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  enddate: string | null;
};

type POSCombo = {
  proid: string;
  proname: string;
  startdate: string | null;
  enddate: string | null;
  active: "Y" | "N";
};

type Difference = {
  field: "proname" | "enddate" | "active";
  requestValue: string;
  posValue: string;
};

type VerifyResult = {
  reqdtlid: number;
  itemcode: string;
  posStatus: "matched" | "mismatch" | "not_found";
  differences: Difference[];
};

function normalizeDate(d: string | null): string {
  if (!d) return "";
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return d;
  return parsed.toISOString().substring(0, 10);
}

function compareCombo(input: ComboInput, pos: POSCombo): Difference[] {
  const diffs: Difference[] = [];

  if (pos.proname.trim() !== input.itemname.trim()) {
    diffs.push({
      field: "proname",
      requestValue: input.itemname.trim(),
      posValue: pos.proname.trim(),
    });
  }

  const dbEnd = normalizeDate(input.enddate);
  const posEnd = normalizeDate(pos.enddate);
  if (dbEnd !== posEnd) {
    diffs.push({
      field: "enddate",
      requestValue: input.enddate ?? "—",
      posValue: pos.enddate ?? "—",
    });
  }

  if (pos.active !== "Y") {
    diffs.push({ field: "active", requestValue: "Y", posValue: pos.active });
  }

  return diffs;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: emp } = await supabaseAdmin
    .from("employees")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (emp?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { combos } = (await req.json()) as { combos: ComboInput[] };

  const posUrl = process.env.POS_COMBO_API_URL;
  if (!posUrl) {
    return NextResponse.json(
      { error: "POS_COMBO_API_URL is not configured in .env.local" },
      { status: 500 }
    );
  }

  let posCombos: POSCombo[];
  try {
    const res = await fetch(posUrl);
    if (!res.ok) throw new Error(`POS API returned ${res.status}`);
    posCombos = await res.json();
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to fetch POS data: ${err.message ?? "Unknown error"}` },
      { status: 502 }
    );
  }

  const posMap = new Map<string, POSCombo>(
    posCombos.map((c) => [String(c.proid), c])
  );

  const results: VerifyResult[] = combos.map((input) => {
    const pos = posMap.get(String(input.itemcode));
    if (!pos) {
      return {
        reqdtlid: input.reqdtlid,
        itemcode: input.itemcode,
        posStatus: "not_found",
        differences: [],
      };
    }
    const differences = compareCombo(input, pos);
    return {
      reqdtlid: input.reqdtlid,
      itemcode: input.itemcode,
      posStatus: differences.length === 0 ? "matched" : "mismatch",
      differences,
    };
  });

  return NextResponse.json({ results, verifiedAt: new Date().toISOString() });
}
```

- [ ] **Step 2: Add `POS_COMBO_API_URL` to `.env.local`**

Open `.env.local` and add:
```
POS_COMBO_API_URL=https://your-pos-api/combos
```
_(Replace with the actual POS REST API endpoint.)_

- [ ] **Step 3: Manual test via curl**

Start the dev server (`npm run dev`), then run:
```bash
curl -X POST http://localhost:3000/api/combos/pos-verify \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste your browser session cookie>" \
  -d '{"combos":[{"reqdtlid":1,"itemcode":"10001","itemname":"Combo Ga","enddate":"2024-12-31"}]}'
```

Expected responses:
- If not logged in → `{"error":"Unauthorized"}` with status 401
- If logged in as non-admin → `{"error":"Forbidden"}` with status 403
- If logged in as admin + `POS_COMBO_API_URL` not set → `{"error":"POS_COMBO_API_URL is not configured..."}` with status 500
- If logged in as admin + POS API reachable → `{"results":[...],"verifiedAt":"..."}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/combos/pos-verify/route.ts
git commit -m "Feat - Add POST /api/combos/pos-verify route for POS combo comparison"
```

---

## Task 2: Hook — `usePOSVerify`

**Files:**
- Create: `src/hooks/usePOSVerify.ts`

**Interfaces:**
- Produces: `usePOSVerify()` → `{ results, loading, error, verifiedAt, verify, reset }`
- `verify(combos: ComboVerifyInput[])` calls `POST /api/combos/pos-verify`
- `results` is `POSVerifyResult[]` keyed by `reqdtlid`
- Export types: `POSVerifyResult`, `POSDifference`, `ComboVerifyInput`

- [ ] **Step 1: Create the hook**

```typescript
// src/hooks/usePOSVerify.ts
"use client";

import { useState, useCallback } from "react";

export type POSDifference = {
  field: "proname" | "enddate" | "active";
  requestValue: string;
  posValue: string;
};

export type POSVerifyResult = {
  reqdtlid: number;
  itemcode: string;
  posStatus: "matched" | "mismatch" | "not_found";
  differences: POSDifference[];
};

export type ComboVerifyInput = {
  reqdtlid: number;
  itemcode: string;
  itemname: string;
  enddate: string | null;
};

export function usePOSVerify() {
  const [results, setResults] = useState<POSVerifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);

  const verify = useCallback(async (combos: ComboVerifyInput[]) => {
    if (combos.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/combos/pos-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ combos }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results);
      setVerifiedAt(data.verifiedAt);
    } catch (err: any) {
      setError(err.message ?? "Verify failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResults([]);
    setError(null);
    setVerifiedAt(null);
  }, []);

  return { results, loading, error, verifiedAt, verify, reset };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `usePOSVerify.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/usePOSVerify.ts
git commit -m "Feat - Add usePOSVerify hook for POS combo verification state"
```

---

## Task 3: Integrate into `ComboTable`

**Files:**
- Modify: `src/components/(product)/combo/ComboTable.tsx`

**Interfaces:**
- Consumes: `usePOSVerify` from `@/hooks/usePOSVerify`
- Consumes types: `POSVerifyResult`, `ComboVerifyInput` from `@/hooks/usePOSVerify`
- The `combos` array from `useCombos()` provides `reqdtlid`, `itemcode`, `itemname`, `enddate`

- [ ] **Step 1: Add imports at the top of `ComboTable.tsx`**

Below the existing imports (after line 11 `import ComboDetailModal`), add:

```typescript
import { usePOSVerify, type POSVerifyResult } from "@/hooks/usePOSVerify";
```

- [ ] **Step 2: Add hook and state inside the component**

Inside `export default function ComboTable()`, after the existing state declarations (after `const isAdmin = profile?.role === "admin";`), add:

```typescript
const { results: verifyResults, loading: verifying, error: verifyError, verifiedAt, verify } = usePOSVerify();
const [expandedDiff, setExpandedDiff] = useState<number | null>(null);

const verifyMap = new Map<number, POSVerifyResult>(
  verifyResults.map((r) => [r.reqdtlid, r])
);

const handleVerifyPOS = () => {
  const input = combos.map((c) => ({
    reqdtlid: c.reqdtlid,
    itemcode: c.itemcode,
    itemname: c.itemname,
    enddate: c.enddate,
  }));
  verify(input);
  setExpandedDiff(null);
};

const matchedCount = verifyResults.filter((r) => r.posStatus === "matched").length;
const mismatchCount = verifyResults.filter((r) => r.posStatus === "mismatch").length;
const notFoundCount = verifyResults.filter((r) => r.posStatus === "not_found").length;
```

- [ ] **Step 3: Add "Verify POS" button + summary bar to the toolbar**

In the toolbar `<div className="p-4 flex flex-wrap gap-3 items-center">`, add before the closing `</div>` of the toolbar (after the count span at line ~178):

```tsx
{isAdmin && (
  <button
    onClick={handleVerifyPOS}
    disabled={verifying || combos.length === 0}
    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-500 text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    {verifying ? (
      <>
        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Verifying...
      </>
    ) : (
      "Verify POS"
    )}
  </button>
)}
```

Then, after the toolbar closing `</div>` and before the Table section, add the summary + error bar:

```tsx
{verifyError && (
  <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
    Verify error: {verifyError}
  </div>
)}
{verifyResults.length > 0 && !verifyError && (
  <div className="px-4 py-2 flex items-center gap-4 text-xs border-b border-gray-100 dark:border-white/[0.05] bg-gray-50 dark:bg-white/[0.02]">
    <span className="text-green-600 dark:text-green-400 font-medium">✅ {matchedCount} matched</span>
    <span className="text-red-500 font-medium">❌ {mismatchCount} mismatch</span>
    <span className="text-orange-500 font-medium">⚠️ {notFoundCount} not found</span>
    {verifiedAt && (
      <span className="text-gray-400 ml-auto">
        Verified at: {new Date(verifiedAt).toLocaleString("vi-VN")}
      </span>
    )}
  </div>
)}
```

- [ ] **Step 4: Add "POS Status" column header**

In `<TableHeader>`, after the last `<TableCell isHeader ...>Req Status</TableCell>` (around line 214), add:

```tsx
{verifyResults.length > 0 && (
  <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400">
    POS Status
  </TableCell>
)}
```

Also update all `colSpan` values in the loading/error/empty rows from `9` to `{verifyResults.length > 0 ? 10 : 9}`:

```tsx
// loading row:
<td colSpan={verifyResults.length > 0 ? 10 : 9} className="...">
// error row:
<td colSpan={verifyResults.length > 0 ? 10 : 9} className="...">
// empty row:
<td colSpan={verifyResults.length > 0 ? 10 : 9} className="...">
```

- [ ] **Step 5: Add "POS Status" cell + inline diff per data row**

Replace the `combos.map((combo, idx) => { ... return (<TableRow ...> ... </TableRow>); })` block. Add the POS status cell and inline diff row after the existing `</TableRow>`. The full replacement is:

```tsx
combos.map((combo, idx) => {
  const dateStatus = getDateStatus(combo.startdate, combo.enddate);
  const reqStatus = combo.requests?.stt?.name ?? "";
  const reqStatusColor = REQ_STATUS_COLOR[reqStatus.toLowerCase()] ?? "warning";
  const posResult = verifyMap.get(combo.reqdtlid);
  const isExpanded = expandedDiff === combo.reqdtlid;

  return (
    <React.Fragment key={combo.reqdtlid}>
      <TableRow
        onClick={() => setSelected(combo)}
        className="hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer"
      >
        <TableCell className="px-5 py-3 text-center text-gray-400 text-theme-xs dark:text-gray-500">
          {(currentPage - 1) * PAGE_SIZE + idx + 1}
        </TableCell>
        <TableCell className="px-5 py-3 font-mono text-gray-700 text-theme-sm dark:text-gray-300 font-medium">
          {combo.itemcode}
        </TableCell>
        <TableCell className="px-5 py-3 text-gray-700 text-theme-sm dark:text-gray-300">
          {combo.itemname}
        </TableCell>
        <TableCell className="px-5 py-3 text-end text-gray-700 text-theme-sm dark:text-gray-300">
          {combo.price != null ? combo.price.toLocaleString("vi-VN") : "—"}
        </TableCell>
        <TableCell className="px-5 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
          {formatDate(combo.startdate)}
        </TableCell>
        <TableCell className="px-5 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
          {formatDate(combo.enddate)}
        </TableCell>
        <TableCell className="px-5 py-3">
          <Badge color={dateStatus.color} size="sm">{dateStatus.label}</Badge>
        </TableCell>
        <TableCell className="px-5 py-3 font-mono text-gray-500 text-theme-sm dark:text-gray-400">
          {combo.requests?.requestcode ?? "—"}
        </TableCell>
        <TableCell className="px-5 py-3">
          {reqStatus ? (
            <Badge color={reqStatusColor} size="sm">{reqStatus}</Badge>
          ) : (
            <span className="text-gray-400 text-theme-sm">—</span>
          )}
        </TableCell>
        {verifyResults.length > 0 && (
          <TableCell className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
            {!posResult ? (
              <span className="text-gray-300 text-theme-xs">—</span>
            ) : posResult.posStatus === "matched" ? (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Matched</span>
            ) : posResult.posStatus === "not_found" ? (
              <span className="text-xs font-medium text-orange-500">⚠️ Not Found</span>
            ) : (
              <button
                onClick={() => setExpandedDiff(isExpanded ? null : combo.reqdtlid)}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                ❌ Mismatch
                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
              </button>
            )}
          </TableCell>
        )}
      </TableRow>

      {isExpanded && posResult?.differences && (
        <tr className="bg-red-50/50 dark:bg-red-500/5">
          <td colSpan={verifyResults.length > 0 ? 10 : 9} className="px-8 py-3">
            <table className="text-xs w-auto border border-red-200 dark:border-red-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-red-100/60 dark:bg-red-500/10">
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Request (DB)</th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">POS</th>
                </tr>
              </thead>
              <tbody>
                {posResult.differences.map((diff) => (
                  <tr key={diff.field} className="border-t border-red-200/50 dark:border-red-500/20">
                    <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{diff.field}</td>
                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{diff.requestValue}</td>
                    <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-medium">{diff.posValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
})
```

Also add `import React from "react";` at the top if not already present (needed for `React.Fragment`).

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Manual test in browser**

1. Log in as admin → navigate to `/product/combo`
2. Click "Verify POS" → should show spinner then results
3. Check: summary bar appears, POS Status column appears
4. Click a mismatch row → inline diff expands
5. Log in as non-admin → "Verify POS" button should not appear

- [ ] **Step 8: Commit**

```bash
git add src/components/(product)/combo/ComboTable.tsx
git commit -m "Feat - Add Verify POS button and POS Status column to ComboTable"
```

---

## Task 4: Integrate into `RequestViewModal`

**Files:**
- Modify: `src/components/history-request/RequestViewModal.tsx`

**Interfaces:**
- Consumes: `usePOSVerify` from `@/hooks/usePOSVerify`
- Consumes: `useProfile` from `@/hooks/useProfile`
- The `details` array (local state in RequestViewModal) has `reqdtlid`, `itemcode`, `itemname`, `enddate`, `itemtype`
- Only rows where `item.itemtype === 'combo'` are sent to verify and get a POS Status cell

- [ ] **Step 1: Add imports to `RequestViewModal.tsx`**

Below the existing imports (after `import { exportRequestToExcel }` line), add:

```typescript
import { usePOSVerify, type POSVerifyResult } from "@/hooks/usePOSVerify";
import useProfile from "@/hooks/useProfile";
```

- [ ] **Step 2: Add hook calls inside the component**

Inside `export default function RequestViewModal(...)`, after the existing state declarations (after `const [comboTotal, setComboTotal] = useState(0);`), add:

```typescript
const { profile } = useProfile();
const isAdmin = profile?.role === "admin";

const {
  results: verifyResults,
  loading: verifying,
  error: verifyError,
  verifiedAt,
  verify,
  reset: resetVerify,
} = usePOSVerify();

const [expandedDiff, setExpandedDiff] = useState<number | null>(null);

const verifyMap = new Map<number, POSVerifyResult>(
  verifyResults.map((r) => [r.reqdtlid, r])
);

const handleVerifyPOS = () => {
  const comboCombos = details
    .filter((d) => d.itemtype === "combo")
    .map((d) => ({
      reqdtlid: d.reqdtlid,
      itemcode: d.itemcode,
      itemname: d.itemname,
      enddate: d.enddate || null,
    }));
  verify(comboCombos);
  setExpandedDiff(null);
};
```

Also reset verifyResults when modal closes. Find the `useEffect` that resets state on `request` change (around line 131) and add `resetVerify()` inside:

```typescript
useEffect(() => {
  if (request) {
    setEditData({ ... });
    const mapped = mapDetailsFromRequest(request);
    setDetails(mapped);
    setOriginalDetails(mapped);
  }
  setIsEditing(false);
  resetVerify();          // ← add this line
  setExpandedDiff(null);  // ← add this line
}, [request, isOpen]);
```

- [ ] **Step 3: Add "Verify POS" button and POS Status column header to the Promotion Items table header**

Find the Promotion Items header block (around line 417):

```tsx
<div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between">
  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    Promotion Items
    <span className="ml-2 text-xs font-normal text-gray-400">
      ({details.length} item{details.length !== 1 ? "s" : ""})
    </span>
  </p>
  {isEditing && (
    <Button variant="outline" size="sm" onClick={handleOpenAddItem}>
      <PlusIcon /> Add Item
    </Button>
  )}
</div>
```

Replace with:

```tsx
<div className="px-4 py-3 border-b border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-white/[0.03] flex items-center justify-between gap-2">
  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
    Promotion Items
    <span className="ml-2 text-xs font-normal text-gray-400">
      ({details.length} item{details.length !== 1 ? "s" : ""})
    </span>
  </p>
  <div className="flex items-center gap-2">
    {isAdmin && !isEditing && details.some((d) => d.itemtype === "combo") && (
      <button
        onClick={handleVerifyPOS}
        disabled={verifying}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-brand-500 text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {verifying ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Verifying...
          </>
        ) : (
          "Verify POS"
        )}
      </button>
    )}
    {isEditing && (
      <Button variant="outline" size="sm" onClick={handleOpenAddItem}>
        <PlusIcon /> Add Item
      </Button>
    )}
  </div>
</div>
```

- [ ] **Step 4: Add verify error bar below the Promotion Items header**

Directly after the header block above and before `<div className="overflow-x-auto">`, add:

```tsx
{verifyError && (
  <div className="px-4 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20">
    Verify error: {verifyError}
  </div>
)}
```

- [ ] **Step 5: Add "POS Status" column header to the table `<thead>`**

Find the `<thead>` block (around line 433). After `{isEditing && <th>Action</th>}`, add:

```tsx
{verifyResults.length > 0 && (
  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-gray-500">
    POS Status
  </th>
)}
```

- [ ] **Step 6: Add "POS Status" cell + inline diff to each data row**

Find the `details.map((item, idx) => (...)` block inside `<tbody>`. Replace the existing `<tr>` map with:

```tsx
details.map((item, idx) => {
  const posResult = item.reqdtlid ? verifyMap.get(item.reqdtlid) : undefined;
  const isCombo = item.itemtype === "combo";
  const isExpanded = expandedDiff === item.reqdtlid;

  return (
    <React.Fragment key={item.reqdtlid ?? idx}>
      <tr className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{idx + 1}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">{item.itemcode || "-"}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.itemname || "-"}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
          <DescriptionCell value={item.description ?? ""} />
        </td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.servicetype || "-"}</td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.discount ?? "-"}</td>
        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.price ?? "-"}</td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.startdate || "-"}</td>
        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.enddate || "-"}</td>
        {isEditing && (
          <td className="px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditItem(idx)}
                className="p-1.5 text-gray-400 hover:text-brand-500 rounded transition-colors"
                title="Edit item"
              >
                <PencilIcon />
              </button>
              <button
                onClick={() => handleDeleteItem(idx)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                title="Delete item"
              >
                <TrashBinIcon />
              </button>
            </div>
          </td>
        )}
        {verifyResults.length > 0 && (
          <td className="px-4 py-3">
            {!isCombo || !posResult ? (
              <span className="text-gray-300 text-xs">—</span>
            ) : posResult.posStatus === "matched" ? (
              <span className="text-xs font-medium text-green-600 dark:text-green-400">✅ Matched</span>
            ) : posResult.posStatus === "not_found" ? (
              <span className="text-xs font-medium text-orange-500">⚠️ Not Found</span>
            ) : (
              <button
                onClick={() => setExpandedDiff(isExpanded ? null : item.reqdtlid)}
                className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
              >
                ❌ Mismatch
                <span className="text-gray-400 text-[10px]">{isExpanded ? "▲" : "▼"}</span>
              </button>
            )}
          </td>
        )}
      </tr>

      {isExpanded && posResult?.differences && (
        <tr className="bg-red-50/50 dark:bg-red-500/5">
          <td colSpan={isEditing ? (verifyResults.length > 0 ? 11 : 10) : (verifyResults.length > 0 ? 10 : 9)} className="px-8 py-3">
            <table className="text-xs w-auto border border-red-200 dark:border-red-500/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-red-100/60 dark:bg-red-500/10">
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Field</th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">Request (DB)</th>
                  <th className="px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400">POS</th>
                </tr>
              </thead>
              <tbody>
                {posResult.differences.map((diff) => (
                  <tr key={diff.field} className="border-t border-red-200/50 dark:border-red-500/20">
                    <td className="px-3 py-1.5 font-mono text-gray-500 dark:text-gray-400">{diff.field}</td>
                    <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">{diff.requestValue}</td>
                    <td className="px-3 py-1.5 text-red-600 dark:text-red-400 font-medium">{diff.posValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
})
```

Add `import React from "react";` at the top if not already present.

Also update the empty-state `colSpan` in the `details.length === 0` branch:

```tsx
<td colSpan={isEditing ? (verifyResults.length > 0 ? 11 : 10) : (verifyResults.length > 0 ? 10 : 9)} className="...">
```

- [ ] **Step 7: Add verified-at timestamp below the Promotion Items table**

After the closing `</div>` of the `overflow-x-auto` div (after the `</table>`), and before the closing `</div>` of the rounded-xl border block, add:

```tsx
{verifiedAt && (
  <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-white/[0.07] text-right">
    Verified at: {new Date(verifiedAt).toLocaleString("vi-VN")}
  </div>
)}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 9: Manual test in browser**

1. Log in as admin → open My Request or Load Request → open a request that has combo items
2. "Verify POS" button should appear in the Promotion Items header (only when not editing)
3. Click "Verify POS" → spinner appears → results show
4. Rows with `itemtype='combo'` show POS Status badge; non-combo rows show `—`
5. Mismatch row → click → inline diff table expands
6. Close modal and reopen → verify results are reset (no stale status shown)

- [ ] **Step 10: Commit**

```bash
git add src/components/history-request/RequestViewModal.tsx
git commit -m "Feat - Add Verify POS button and POS Status column to RequestViewModal"
```
