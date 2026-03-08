---
stepsCompleted: [1, 2, 3]
session_continued: true
continuation_date: '2026-03-08'
inputDocuments: []
session_topic: 'Clone Zalora e-commerce app using existing Redbox Apparel schema'
session_goals: 'Map Zalora features to existing schema, identify gaps, plan customer-facing storefront'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'SCAMPER Method', 'Cross-Pollination']
ideas_generated: [63]
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** FashionMaster
**Date:** 2026-03-08

## Session Overview

**Topic:** Clone the Zalora fashion e-commerce app leveraging the existing Redbox Apparel Convex schema and backend
**Goals:** Identify what already exists, what's missing, and plan the customer-facing storefront prototype

### Session Setup

Zalora app features were researched and mapped against the existing Redbox Apparel schema (28 tables) and existing route structure (admin, branch, warehouse, POS, driver, supplier, and customer route groups).

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Clone Zalora e-commerce app with focus on mapping features to existing schema

**Recommended Techniques:**

- **Role Playing:** Explore the storefront from 3 customer personas — casual browser, decisive buyer, returning customer
- **SCAMPER Method:** Systematically decide what to clone, skip, modify, or improve from Zalora's feature set
- **Cross-Pollination:** Borrow winning UX patterns from Shopee, Shein, Lazada, and Uniqlo apps

**AI Rationale:** This sequence moves from empathy (understanding user needs) → systematic analysis (feature decisions) → creative expansion (best-of-breed features), ensuring the clone is user-centered and strategically designed.

## Technique Execution Results

### Phase 1: Role Playing (3 Personas)

#### Persona 1: Maria the Browser (22, casual mobile shopper)

**[Homepage #1]**: Flash Sale Hero Banner — Countdown timer with urgency-driven hero banner, single high-impact image, one-tap to shop. Less cognitive load than Zalora's carousel.

**[Homepage #2]**: Trending Now Grid — "Trending in Manila" showing 6-8 products with social proof ("42 sold today"), localized using branch proximity data.

**[Homepage #3]**: Style Categories with Lifestyle Images — Lifestyle mood boards ("Street Style", "Office Ready", "Weekend Vibes") instead of garment-type categories. Matches Gen-Z browsing behavior.

**[Browse #4]**: Infinite Scroll with Sticky Filters — Cursor-based pagination backend + infinite scroll UX on mobile. Sticky filter bar with collapsible chips.

**[Browse #5]**: Quick-View Bottom Sheet — Tapping product card opens bottom sheet (not full page) with photos, price, sizes, "Add to Cart" — preserves scroll position.

**[Browse #6]**: Visual Size Indicator — Colored dots on product cards showing available sizes. Grayed out = out of stock. Eliminates click-to-check frustration.

**[Discovery #7]**: "Complete the Look" Suggestions — Styled outfit recommendations below products using style/category taxonomy for cross-selling.

**[Discovery #8]**: Recently Viewed Carousel — Persistent "Continue Shopping" row using `recentlyViewed` table. Available on homepage and category pages.

**[Engagement #9]**: Guest Browsing with Soft Login Wall — Full browse/wishlist/cart access without registration. Login wall only at checkout. Reduces friction.

**[Engagement #10]**: Price Drop Notifications — "Notify me when price drops" using `notifications` table with `price_drop` type. Re-engagement hook for browsers.

#### Persona 2: Carlos the Buyer (30, decisive, needs polo by Friday)

**[Search #11]**: Smart Search with Auto-Suggestions — Predictive search showing category, brand, and product suggestions as user types. Understands catalog taxonomy.

**[Search #12]**: Filter by "Available for Express Delivery" — Toggle filter showing only items in stock at nearest branch with fast delivery capability.

**[PDP #13]**: Size Recommendation Engine — Quick quiz (height, weight, fit preference) using `sizeCharts` table data. Reduces returns.

**[PDP #14]**: Stock Urgency Indicator — "Only 3 left in your size!" from real `inventoryItems` quantity. Real scarcity, not fake.

**[PDP #15]**: Color Swatch with Live Preview — Tapping color swatch instantly swaps product image. Shows available sizes per color.

**[Cart #16]**: Promo Auto-Apply — Cart automatically checks and applies best available promotion. "You saved P150!" Uses existing promo engine.

**[Checkout #17]**: Express Checkout Flow — 3-step: Address → Payment → Confirm. Saved addresses pre-selected. Under 60 seconds for returning customers.

**[Checkout #18]**: Multiple Payment Options with COD Default — COD first (most popular in PH), then GCash, Maya, Card, Bank Transfer. Matches schema payment types.

**[Checkout #19]**: Delivery Date Estimate — "Estimated delivery: March 10-11" based on branch proximity and shipping method. Uses `shipments` table.

**[Post-Purchase #20]**: Order Tracking Timeline — Visual timeline: Paid → Processing → Shipped → Out for Delivery → Delivered. Push notifications at each stage.

#### Persona 3: Tita Lourdes the Loyalist (45, returning customer)

**[Returns #21]**: Easy Return Request Flow — Self-service "Return this item" with reason selection, photo upload, refund method choice. No phone call needed.

**[Returns #22]**: Exchange Instead of Return — "Wrong size? Swap it!" one-tap exchange that checks stock and creates new order while processing return.

**[Loyalty #23]**: Points Balance Dashboard — "2,450 points (P245 value)" with tier status, progress bar to next tier, earning history. Uses `loyaltyAccounts` + `loyaltyTransactions`.

**[Loyalty #24]**: Birthday Bonus & Tier Perks — Push notification with bonus points + free shipping on birthday. Uses `customers.dateOfBirth`.

**[Reorder #25]**: "Buy Again" Section — Grid of previously purchased items with current prices and stock status. One-tap reorder from order history.

**[Reorder #26]**: Saved Sizes Profile — Remembered sizes per category (Tops: L, Bottoms: 32, Shoes: 8). Auto-selected on product pages.

**[Account #27]**: Multiple Delivery Addresses — Address book with labels (Home, Office, Mom's House) using `customerAddresses` table. Default pre-selected.

**[Account #28]**: Order History with Filters — Status filters (Active, Delivered, Returned) + date range. Expandable order details with tracking and receipt.

**[Engagement #29]**: Restock Notifications — "Notify me when back in stock" using `notifications` table with `restock` type. Prominent placement.

**[Trust #30]**: Verified Purchase Reviews — Reviews with "Verified Purchase" badge, rating + photos + size feedback. Uses `reviews.isVerifiedPurchase`.

---

### Phase 2: SCAMPER Method (Feature Decisions)

#### S — Substitute

**[Substitute #31]**: Style-Centric Nav over Brand-Centric — Navigate by occasion ("Date Night", "Gym", "Work") instead of brand names since Redbox has house brands without external brand recognition.

**[Substitute #32]**: Push + SMS over Email — Filipino shoppers respond to push notifications and SMS/Viber over email campaigns. Mobile-first communication.

**[Substitute #33]**: Visual Body Map over Text Size Charts — Human body illustration with tap-to-see measurements instead of Zalora's text-heavy tables. Uses `sizeCharts` data.

#### C — Combine

**[Combine #34]**: Wishlist + Cart as "Save for Later" — Unified experience. Cart items swipe to "Saved". Saved items show stock warnings. One less concept to learn.

**[Combine #35]**: Promos + Vouchers into "Your Deals" — All available discounts in one section. Auto-applied promotions AND collectible voucher codes together.

**[Combine #36]**: Reviews + Size Feedback Merged — When reviewing, also answer "How did the size fit?" Aggregate size feedback displayed on product page.

#### A — Adapt

**[Adapt #37]**: Flash Sales on PH Payday Cycle — Schedule sales around 15th and 30th paydays. "Payday Sale" banners with countdown using `banners` table date ranges.

**[Adapt #38]**: Filipino Fit Guide — "Our M = US S" comparison for local body type calibration. Uses `sizeCharts` data. Reduces returns.

#### M — Modify/Magnify

**[Modify #39]**: Magnified Product Images — Full-screen swipeable gallery with pinch-to-zoom. On-model + flat lay + detail shots. Minimum 4 images per product.

**[Modify #40]**: Partial COD Payment — "Pay partial now (GCash) + partial COD" for high-value orders. Reduces COD risk while keeping the option.

#### P — Put to Other Uses

**[Put to Use #41]**: POS Data Powers "Bestsellers" — Real physical store sales data drives online bestseller rankings. Omnichannel advantage over pure e-commerce.

**[Put to Use #42]**: Branch Inventory for BOPIS — "In stock at SM Manila — pick up today!" Buy-online-pickup-in-store using live branch inventory.

**[Put to Use #43]**: Promo Engine for Personalized Offers — Multi-filter promo engine generates hyper-personalized discounts: "20% off Large Blue T-Shirts — just for you."

#### E — Eliminate

**[Eliminate #44]**: No Magazine/Editorial Section — Skip fashion articles. Requires constant content creation, low engagement. Focus on shopping.

**[Eliminate #45]**: No Multi-Seller Marketplace — Single brand = no seller ratings, no seller pages, simpler trust messaging, faster development.

**[Eliminate #46]**: In-Store Returns Only (for MVP) — Returns handled at physical branches. No courier pickup scheduling. Leverages physical presence.

#### R — Reverse/Rearrange

**[Reverse #47]**: Style Quiz First — First-time users pick 3 outfits they like before seeing the homepage. Instant personalization without data history.

**[Reverse #48]**: Payment Before Address — For digital wallet users, capture payment intent first (fastest step), then confirm shipping address. Reduces checkout drop-off.

---

### Phase 3: Cross-Pollination (Best of Other Apps)

#### From Shopee

**[Shopee #49]**: Gamified Daily Check-In — Daily reward that converts to discount vouchers. Drives DAU. Uses `loyaltyTransactions` with `bonus` type.

**[Shopee #50]**: Live Chat Support Widget — Floating chat button on every page. Simple FAQ bot escalating to human support.

**[Shopee #51]**: Voucher Collection Page — Dedicated "Vouchers" tab to browse and "collect" available vouchers. Gamifies discount discovery.

#### From Shein

**[Shein #52]**: Photo Reviews from Real Customers — Customer-uploaded photos prominently displayed. Uses `reviews.imageStorageIds`. Strongest conversion tool.

**[Shein #53]**: Style Gallery / User-Generated Looks — Customer outfit photos with tappable product tags. Community-driven style inspiration.

**[Shein #54]**: New Arrivals with "Hot" Tags — Weekly "New In" section. Items tagged "HOT"/"SELLING FAST" based on sales velocity data.

#### From Lazada

**[Lazada #55]**: Cart-Level Shipping Transparency — Shipping fee breakdown in cart, not checkout surprise. "Free shipping over P999" with progress bar.

**[Lazada #56]**: Bundle Deals / "Frequently Bought Together" — Auto-generated bundles from POS transaction history with small bundle discount.

**[Lazada #57]**: Multiple Delivery Speed Options — Standard (free), Express (P99, 1-2 days), Same-Day (P199, from nearest branch). Leverages branch inventory.

#### From Uniqlo

**[Uniqlo #58]**: Clean Minimalist Product Cards — One clean image, name, price, color dots. No clutter. Premium aesthetic builds brand perception.

**[Uniqlo #59]**: Post-Purchase Size Feedback — 7 days after delivery: "How did the fit feel?" Feeds size recommendation engine passively.

**[Uniqlo #60]**: Store Stock Checker — "Check store availability" showing which branches have the item in stock. Drives online-to-offline traffic.

#### Hybrid / Original

**[Hybrid #61]**: Social Sharing with Outfit Preview — Generates styled card images optimized for Instagram Stories, Facebook, Viber sharing. Word-of-mouth driver.

**[Hybrid #62]**: Smart Restock Alerts — Predictive: "Time to restock your socks? Here's 10% off." Based on purchase cycle patterns from order history.

**[Hybrid #63]**: Branch-Exclusive Online Drops — Products available only through specific branches online. Geographic scarcity creates buzz and local identity.

---

### Creative Facilitation Narrative

This session explored the Zalora clone from three angles: empathy (what customers actually need), systematic analysis (what to build/skip/improve), and creative expansion (best patterns from competitors). Key themes emerged: **omnichannel advantage** (branches + POS data are unique assets no pure e-commerce competitor has), **Filipino-first design** (payday sales, COD-first, push over email, local sizing), and **simplicity over features** (single brand advantage means less marketplace complexity). The strongest ideas leverage existing schema tables — `recentlyViewed`, `loyaltyAccounts`, `sizeCharts`, `banners`, `notifications`, and the promo engine — rather than building from scratch.

### Session Highlights

**Strongest Ideas by Impact:**
1. BOPIS / Store Stock Checker (#42, #60) — Unique omnichannel competitive advantage
2. Promo Auto-Apply (#16) — Existing engine, massive UX win
3. Express Checkout 3-Step Flow (#17) — Direct conversion impact
4. Style-Centric Navigation (#31, #47) — Differentiation from Zalora
5. POS-Powered Bestsellers (#41) — Real data, unique to Redbox

**Schema Tables Already Supporting These Ideas:**
- `recentlyViewed` → #8
- `loyaltyAccounts` + `loyaltyTransactions` → #23, #24, #49
- `sizeCharts` → #13, #33, #38
- `banners` → #1, #37
- `notifications` → #10, #29
- `reviews` → #30, #36, #52
- `vouchers` + `voucherRedemptions` → #35, #51
- `customerAddresses` → #27
- `wishlists` → #9, #34
- Promo engine → #16, #35, #43, #56
