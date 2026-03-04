# Plan: Monthly & Yearly Revenue Forecast in Predictive Tab

## What We're Adding
A new **"Sales Forecast"** section in the Predictive tab (both HQ and Branch) that shows monthly and yearly revenue projections based on historical sales data.

## Approach — Simple Linear Projection
Use the **current month's daily average** to project the full month, and the **trailing monthly averages** to project the year. No ML — just clean arithmetic the user can verify.

### Forecast Logic

**Monthly Forecast:**
- Compute revenue for the current month so far (day 1 → today)
- `dailyAvg = currentMonthRevenue / daysElapsedThisMonth`
- `projectedMonth = dailyAvg × totalDaysInMonth`
- Show last month's actual revenue for comparison + trend arrow

**Yearly Forecast:**
- Compute revenue for the current year so far (Jan 1 → today)
- `dailyAvg = currentYearRevenue / daysElapsedThisYear`
- `projectedYear = dailyAvg × totalDaysInYear` (365 or 366)
- Show last year's actual revenue for comparison (if data exists) + trend arrow

## Files to Change

### Backend (2 files)
1. **`convex/dashboards/hqDdpAnalytics.ts`** — Add `getHQSalesForecast` query
   - Aggregates transactions across all retail branches
   - Returns: `{ monthly: { currentRevenue, daysElapsed, totalDays, projected, lastMonthActual }, yearly: { currentRevenue, daysElapsed, totalDays, projected, lastYearActual }, branchCount }`

2. **`convex/dashboards/branchAnalytics.ts`** — Add `getSalesForecast` query
   - Same logic but scoped to a single branch via `withBranchScope`
   - Returns same shape minus `branchCount`

### Frontend (2 files)
3. **`app/admin/analytics/page.tsx`** — Add forecast section in Predictive tab
   - New `useQuery` for `getHQSalesForecast`
   - Card with two rows: Monthly forecast + Yearly forecast
   - Each row: current revenue, daily avg, projected total, last period actual + trend

4. **`app/branch/analytics/page.tsx`** — Same section for branch-level
   - Uses `getSalesForecast` from branchAnalytics

### UI Layout (inside each forecast row)
```
Monthly Forecast
┌──────────────────┬──────────────┬─────────────────────┬───────────────────┐
│ This Month (Xd)  │ Daily Avg    │ Projected Month     │ Last Month Actual │
│ ₱123,456         │ ₱12,345      │ ₱345,678            │ ₱300,000 ↑15%    │
└──────────────────┴──────────────┴─────────────────────┴───────────────────┘

Yearly Forecast
┌──────────────────┬──────────────┬─────────────────────┬──────────────────┐
│ This Year (Xd)   │ Daily Avg    │ Projected Year      │ Last Year Actual │
│ ₱1,234,567       │ ₱12,345      │ ₱4,500,000          │ ₱4,000,000 ↑12% │
└──────────────────┴──────────────┴─────────────────────┴──────────────────┘
```

## Order of Sections in Predictive Tab (after change)
1. **Sales Forecast** (NEW — monthly + yearly)
2. Revenue Projection (existing — weekly)
3. Restock Suggestions (existing)
4. Demand Forecast (existing)
