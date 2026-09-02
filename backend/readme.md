====================================================================
 BARTER TRADING PLATFORM — PROJECT DOCUMENTATION
 (Reference: Bartercard.com.au style trade-dollar platform)
====================================================================

Purpose of this file:
This document explains the complete working of the platform, the
reasoning behind key decisions, and how the database schema maps to
the actual business flow. Any developer picking up this project
later should be able to read this file + schema.prisma and
understand the whole system without needing a separate handover call.

--------------------------------------------------------------------
1. PROJECT OVERVIEW
--------------------------------------------------------------------

This is a B2B/B2C barter trading platform where businesses and
customers trade goods/services using an internal currency called
"Trade Dollars" instead of real cash.

Key principle (IMPORTANT — read this before touching any wallet
code):

  Trade Dollars are NOT real money. There is NO payment gateway,
  NO bank integration, and NO cash ever moves through this
  platform. Every balance, every transaction, every fee is just a
  number stored in the database (an internal ledger). The platform
  never touches real banking rails.

This decision was made deliberately by the client to avoid banking/
payment compliance overhead. Do not add Stripe/JazzCash/PayPal or
any payment gateway to this project unless explicitly instructed —
it goes against the core product decision.

--------------------------------------------------------------------
2. TECH STACK
--------------------------------------------------------------------

Frontend : Next.js, Tailwind CSS, Zustand (client state),
           TanStack Query (server state / API caching)

Backend  : Express.js, PostgreSQL, Prisma ORM (v7)

Deployment:
  - Frontend -> Vercel
  - Backend  -> Vercel (serverless, via api/index.js entry point)
               or Railway/Render if long-running cron jobs are
               needed (see section 8, Monthly Fee Job)
  - Database -> Managed Postgres (Neon / Supabase / Railway)

--------------------------------------------------------------------
3. USER ROLES
--------------------------------------------------------------------

Three roles exist (see `Role` enum in schema.prisma):

  CUSTOMER  - Can browse listings, trade (send/receive Trade
              Dollars), cannot list products/services.
  BUSINESS  - Can do everything a customer can, PLUS create
              listings. Must be verified (documents) by admin.
  ADMIN     - Manages users, approvals, wallet limits, currency
              rates, and views platform-wide reports.

--------------------------------------------------------------------
4. COMPLETE USER FLOW (STEP BY STEP)
--------------------------------------------------------------------

STEP 1 — Signup
  - User signs up as either CUSTOMER or BUSINESS.
  - Only basic info is captured at this stage: name, email,
    password (hashed), role, country.
  - `User.status` = PENDING by default.

STEP 2 — Profile Completion (happens right after signup)
  - CUSTOMER  -> fills `CustomerProfile` (phone, address, city,
                 profile picture).
  - BUSINESS  -> fills `BusinessProfile` (business name, category,
                 phone, address, city, logo) AND uploads documents
                 into `BusinessDocument` (business registration
                 proof etc.)
  - Both profiles are 1-to-1 with `User` (unique `userId`), so each
    user has at most one profile of their type.

STEP 3 — Admin Approval
  - Admin reviews pending users (and business documents) in the
    admin dashboard.
  - Admin approves or rejects.
  - On approval:
      a) `User.status` -> APPROVED
      b) (if business) `BusinessProfile.verificationStatus` ->
         APPROVED
      c) A `Wallet` row is created for the user with:
           - balance     = 0
           - creditLimit = admin-configured starting limit
                           (e.g. $1000 or $2000 Trade Dollars)
  - If rejected, `User.status` -> REJECTED (user is notified,
    cannot log in / trade).

STEP 4 — Set Transaction PIN
  - After approval, the user must set a 4-6 digit Transaction PIN
    before they can send any Trade Dollars.
  - This PIN is SEPARATE from the login password. It exists purely
    to authorize outgoing transactions (like a banking app PIN).
  - Stored hashed in `User.transactionPin` (bcrypt/argon2 — never
    plain text).
  - If the user forgets it, the `PinResetToken` model supports a
    "forgot PIN" flow (token emailed, user sets a new PIN).

STEP 5 — Business Listings
  - Approved BUSINESS users create `Listing` records: title,
    description, price (in Trade Dollars), category, image.
  - `Listing.status` can be ACTIVE or PAUSED (business can hide a
    listing without deleting it).
  - Any user (customer or business) can browse/search listings with
    filters: category, price range, country, keyword search, and
    sort (price asc/desc, newest).

STEP 6 — Trading (Send/Receive via QR — the core transaction flow)
  This is the most important flow in the whole system. Order of
  operations matters:

    1. Receiver opens their QR code screen (encodes their userId).
    2. Sender scans the QR code (identifies the receiver).
    3. Sender enters the amount to send.
    4. Sender enters their Transaction PIN.
    5. Backend verifies the PIN (bcrypt.compare against
       `User.transactionPin`).
         - If PIN wrong -> increment `failedPinAttempts`, reject
           transaction. After too many failed attempts, temporarily
           lock the account (`pinLockedUntil`).
         - If PIN correct -> reset `failedPinAttempts` to 0,
           proceed.
    6. Backend checks sender's wallet: does
       (balance - amount - commissionBuyer) stay within
       (0 - creditLimit)? i.e. sender is allowed to go negative up
       to their credit limit, but no further.
    7. If sender has sufficient allowance, run ALL of the following
       inside a SINGLE Prisma database transaction
       (`prisma.$transaction`) so it's all-or-nothing:
         a) Debit sender:   balance -= (amount + commissionBuyer)
         b) Credit receiver: balance += (amount - commissionSeller)
         c) Credit CompanyAccount: totalBalance +=
            (commissionBuyer + commissionSeller)
         d) Create a `Transaction` record (immutable log) with
            amount, commissionBuyer, commissionSeller,
            netAmountToSeller, receiptId, status = SUCCESS.
    8. If any step fails, the whole transaction rolls back —
       nobody's balance changes, and a FAILED transaction status
       may be logged.
    9. On success, both sender and receiver see an auto-generated
       receipt (using `Transaction.receiptId`).

  Commission rule (as given by client):
    - 5% of the trade amount is deducted from the BUYER (sender)
      IN ADDITION to the amount sent.
    - 5% of the trade amount is deducted from the SELLER (receiver)
      OUT OF the amount received.
    - Both 5% portions go to the CompanyAccount (internal, not a
      real bank account).

  Example: Buyer sends 100 Trade Dollars to Seller.
    - Buyer's wallet is debited: 100 + 5 (buyer commission) = 105
    - Seller's wallet is credited: 100 - 5 (seller commission) = 95
    - CompanyAccount receives: 5 + 5 = 10

STEP 7 — Monthly Fee (Automated)
  - A scheduled job (cron) runs once a month.
  - For every APPROVED user with an active wallet, deduct a fixed
    $10 Trade Dollars fee.
  - This deduction is logged in `MonthlyFeeLog` (type =
    MONTHLY_FEE) and credited to `CompanyAccount.totalBalance`.
  - Same table (`MonthlyFeeLog`) is also used to log trade
    commissions (type = TRADE_COMMISSION) for a unified audit trail
    of everything that has ever gone into the CompanyAccount.
  - IMPORTANT: If deploying the backend on Vercel serverless, cron
    jobs need Vercel Cron (or an external scheduler hitting a
    protected API route) since Vercel functions don't keep a
    process running. If using Railway/Render, `node-cron` running
    inside the app is fine.

STEP 8 — Multi-Currency Display (display-only, NOT real trading)
  - Every user has a `country` field.
  - Admin maintains `CountryCurrencyRate`: for each country, a
    currency code, symbol, and a rate (1 Trade Dollar = X local
    currency), manually set/updated by admin (no live exchange rate
    API — admin has full manual control, per client's request).
  - Wherever a Trade Dollar amount is shown in the UI (wallet
    balance, listing price, transaction receipt), the frontend also
    shows the converted local-currency equivalent based on the
    user's country and the current rate.
  - The ACTUAL wallet balance, transactions, and commission
    calculations ALWAYS happen in Trade Dollars. Currency
    conversion is purely a display/UX layer — changing a country's
    rate must NEVER alter historical transaction records or wallet
    balances.

STEP 9 — Admin Dashboard
  Admin can:
    - View/approve/reject pending users and business documents.
    - View/adjust any user's wallet creditLimit manually.
    - View all transactions and filter/search them.
    - View CompanyAccount total balance and fee/commission history
      (via MonthlyFeeLog).
    - Manage CountryCurrencyRate (add country, update rate).

--------------------------------------------------------------------
5. DATABASE SCHEMA MAP (schema.prisma -> business flow)
--------------------------------------------------------------------

  User                 -> Step 1 (signup), holds role/status/country
  CustomerProfile      -> Step 2 (customer profile completion)
  BusinessProfile      -> Step 2 (business profile completion)
  BusinessDocument     -> Step 2 (business verification documents)
  Wallet               -> Step 3 (created on approval), holds
                          balance + creditLimit
  CompanyAccount       -> Step 6/7 (single row, collects all fees)
  Listing              -> Step 5 (business product/service listings)
  Transaction          -> Step 6 (every trade, immutable log)
  MonthlyFeeLog        -> Step 6 & 7 (audit trail of all fees /
                          commissions credited to CompanyAccount)
  PinResetToken        -> Step 4 (forgot-PIN flow)
  CountryCurrencyRate  -> Step 8 (admin-controlled display rates)

--------------------------------------------------------------------
6. KEY BUSINESS RULES (do not break these)
--------------------------------------------------------------------

  1. All money fields use Prisma `Decimal`, never `Float`. Floats
     cause rounding errors in financial calculations.
  2. Every wallet debit/credit MUST happen inside a single
     `prisma.$transaction(...)` block. Never update sender and
     receiver balances in two separate, unguarded queries — this
     creates race conditions where concurrent transactions could
     corrupt balances.
  3. A user can go negative on their wallet balance, but only up to
     their `creditLimit`. This is not a bug — it's the intended
     "starting trade limit" feature from the client.
  4. The Transaction PIN is required for every outgoing transfer.
     No exceptions, no "remember me" bypass in MVP.
  5. Registration is completely FREE. No fee is charged at signup
     or approval — only the recurring monthly fee and per-trade
     commission apply, and both are deducted automatically in Trade
     Dollars, never cash.
  6. CompanyAccount is a single internal ledger row — never create
     a second row for it. All commission + monthly fees always flow
     into this same row.
  7. Currency conversion (Step 8) is read-only/display-only. Do not
     let it influence actual balance math anywhere in the backend.

--------------------------------------------------------------------
7. SECURITY NOTES
--------------------------------------------------------------------

  - Login password and Transaction PIN are two separate secrets,
    hashed separately, never interchangeable.
  - Rate-limit PIN attempts (lock account temporarily after ~5
    failed attempts) to prevent brute-forcing a 4-6 digit PIN.
  - Never log the transaction PIN, password, or full DATABASE_URL
    in application logs.
  - DATABASE_URL and all secrets must live in environment variables
    only (.env locally, Vercel/host environment variables in
    production) — never hardcoded in source files or committed to
    git.

--------------------------------------------------------------------
8. MVP SCOPE (what's IN vs OUT for v1 launch)
--------------------------------------------------------------------

  IN (MVP):
    - Signup + profile completion (customer & business)
    - Admin approval + document verification
    - Wallet with starting credit limit
    - QR-based trade with PIN verification
    - 5%/5% commission auto-deducted to CompanyAccount
    - Fixed $10 monthly fee (automated)
    - Business listings with category/price/country/keyword filters
      + sorting
    - Admin dashboard (users, transactions, company account,
      currency rates)
    - Multi-currency DISPLAY (admin-controlled manual rates)
    - Forgot-PIN flow

  OUT (Phase 2 / later — do not build unless asked):
    - Any real payment gateway / banking integration
    - Live exchange rate API
    - Ratings/reviews on businesses
    - Push notifications / SMS
    - In-app chat
    - Dispute resolution system
    - Multi-admin roles/permissions
    - Mobile app (native)
    - Referral/loyalty system

--------------------------------------------------------------------
9. SUGGESTED FOLDER STRUCTURE (backend)
--------------------------------------------------------------------

  src/
    config/          -> env config, prisma client, logger, passport
    controllers/      -> route handler functions
    services/          -> business logic (wallet, transaction, fee, etc.)
    routes/v1/          -> Express route definitions
    middlewares/      -> auth, PIN verification, error handling
    validations/      -> Joi/Zod schemas for request validation
    utils/           -> helpers (QR generation, receipt id, etc.)
  prisma/
    schema.prisma
    migrations/
  api/
    index.js         -> Vercel serverless entry (exports Express app)

--------------------------------------------------------------------
10. REQUIRED ENVIRONMENT VARIABLES
--------------------------------------------------------------------

  NODE_ENV
  PORT
  DATABASE_URL              (PostgreSQL connection string)
  JWT_SECRET
  JWT_ACCESS_EXPIRATION_MINUTES
  JWT_REFRESH_EXPIRATION_DAYS
  MONTHLY_FEE_AMOUNT         (default 10, keep configurable)
  TRADE_COMMISSION_PERCENT   (default 5, keep configurable per side)
  SMTP_* / RESEND_API_KEY    (for PIN reset emails, notifications)

--------------------------------------------------------------------
END OF DOCUMENT
--------------------------------------------------------------------