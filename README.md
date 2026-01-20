# SmartParking - Terrazas del Sol V

## Project Overview

**SmartParking - Terrazas del Sol V** is a Progressive Web Application (PWA) designed to autonomously manage visitor parking in the "Terrazas del Sol V" condominium. Its core purpose is to replace manual parking coordination (e.g., via WhatsApp) with an efficient, fair, and secure self-management platform for residents. The system prioritizes governance, equity, and security, leveraging data transparency and strict, automated business rules in the absence of physical concierge staff.

### Key Features Implemented:

*   **Interactive Parking Map:** Visual representation of parking spots with real-time status (Free, Occupied, Reserved, Urgent).
*   **Booking System:** Allows residents to book free spots with time quantization (15-minute intervals), duration limits (max 4 hours), and validation against fair-play rules.
*   **Fair Play Rules Engine:** Implements weekly quotas (15 hours/unit), cooldown periods (2 hours between bookings for the same unit), and delinquency checks to ensure equitable usage.
*   **Community Reporting:** Residents can report issues like "Exceeded Time" or "Ghost Bookings" for occupied spots.
*   **Role-Based Access:** Differentiated access for Residents and Admins, with a main layout providing conditional navigation.
*   **Authentication:** Basic login/logout flow using Supabase Auth (Google OAuth example), with proper client/server client separation for Next.js App Router.
*   **Admin Panel (Basic Structure):** A placeholder page for administrative tasks like metrics, rule configuration, and infraction resolution.
*   **Realtime Updates:** Configured Supabase Realtime for instant updates on booking changes (though full integration into UI components will evolve).
*   **QR Code Generation Service:** A utility to generate QR codes for various purposes (e.g., booking confirmation).
*   **Progressive Web App (PWA) Configuration:** Setup with `next-pwa` for enhanced mobile experience.
*   **Robust Testing Suite:** Integrated Vitest for unit tests and Playwright for end-to-end tests, along with a script for Lighthouse audits.

## Technologies Used

*   **Framework:** Next.js 14 (App Router, TypeScript)
*   **Styling:** Tailwind CSS v4, shadcn/ui (for UI components)
*   **Database & Auth:** Supabase (PostgreSQL, Authentication, Realtime)
*   **Form Management:** React Hook Form
*   **Schema Validation:** Zod
*   **Unit Testing:** Vitest
*   **End-to-End Testing:** Playwright
*   **PWA:** `next-pwa`
*   **QR Code Generation:** `qrcode` library

## Getting Started

Follow these instructions to set up and run the project locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm (v9 or higher)
*   A Supabase project (URL and Anon Key)

### 1. Clone the repository

First, create a Git repository and commit the base files, then clone this project into your local machine.

```bash
git clone <repository-url>
cd smartpark_app
```

### 2. Install Dependencies

Navigate to the `smartpark_app` directory and install the project dependencies:

```bash
cd smartpark_app
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the `smartpark_app` directory (at the root of the Next.js app) and add your Supabase project credentials:

```
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

Replace `"YOUR_SUPABASE_URL"` and `"YOUR_SUPABASE_ANON_KEY"` with your actual Supabase project URL and public anon key.

### 4. Database Setup (Supabase)

The database schema and initial Row Level Security (RLS) policies have been defined in migration files. These have already been applied to your Supabase project using the `apply_migration` tool.

You can review the migration files here:
*   `smartpark_app/supabase/migrations/00_init_schema.sql` (Initial tables, enums, triggers)
*   `smartpark_app/supabase/migrations/01_security_policies.sql` (RLS policies for various tables)

**Important:** Ensure `btree_gist` extension is enabled in your Supabase project (Dashboard -> Database -> Extensions) if you encounter issues with the `EXCLUDE` constraint on `bookings` table.

### 5. Running the Application

To start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### 6. Testing

The project includes unit tests, end-to-end tests, and a script for performance/accessibility audits.

#### 6.1. Unit Tests (Vitest)

To run all unit tests:

```bash
npm run test:unit
```

To run tests with coverage report:

```bash
npm run test:coverage
```

To run tests with the Vitest UI:

```bash
npm run test:ui
```

#### 6.2. End-to-End Tests (Playwright)

**Note:** For Playwright tests to run successfully, your application must be running (e.g., via `npm run dev`) and you need to ensure a test user is set up and authenticated for the `e2e/auth.setup.ts` to create the `user.json` authentication state.

First, install Playwright browsers:
```bash
npx playwright install
```

Then, run the E2E tests:
```bash
npm run test:e2e
```

#### 6.3. Performance & Accessibility Checks (Lighthouse)

To run a Lighthouse audit against your running application:

**Note:** Ensure your application is running in development or production mode (e.g., `npm run dev` or `npm run start`) before running this command.

```bash
npm run audit:performance
```

This will generate an `lighthouse-report.html` file in the root of your `smartpark_app` directory.

## Next Steps / TODOs

*   **Complete Authentication Flow:** Implement actual UI for email/password login, user registration, and password reset.
*   **E2E Test Authentication:** Refine `e2e/auth.setup.ts` to programmatically or via UI log in a test user securely.
*   **Admin Panel Functionality:** Build out components for metrics display, rules configuration (CRUD for `config_rules`), and comprehensive infraction resolution.
*   **PWA Icons:** Generate and add proper PWA icons to the `public/icons` directory and update `manifest.json` and `layout.tsx` accordingly.
*   **User Profile Management:** Allow users to manage their license plates and other profile details.
*   **Realtime UI Integration:** Fully integrate Supabase Realtime into UI components (e.g., live updates on the parking map).
*   **Fair Play Rule Enforcement (Triggers/Functions):** Implement database triggers or Edge Functions for server-side enforcement of complex rules like weekly quota and cooldown, supplementing client/server action validation.
*   **Booking Management:** Add functionality for users to view, modify, or cancel their existing bookings.
*   **Onboarding Flow:** Create dedicated pages for new user onboarding, unit assignment, and initial profile setup.
*   **Styling Refinements:** Further refine UI/UX based on provided prototypes, focusing on animations and overall polish.

This documentation should provide a solid foundation for understanding, running, and further developing the SmartParking application.