# System Architecture

## A. Frontend

The frontend (React.js with TypeScript) mainly consists of different **User Interfaces (Screens)**, which are structured and categorized into AdminUI, ConsumerUI, VendorUI, and OrganisationUI as organized in the pages directory. More detailed sub-screens can be found in the respective UI page folders.

**Project Structure:**
```
src/
├── pages/
│   ├── admin/          # Admin dashboard and management
│   ├── auth/           # Authentication screens for all user types
│   ├── consumer/       # Consumer dashboard, profile, listings
│   ├── organisation/   # Charitable organization dashboard and listings
│   └── vendor/         # Vendor dashboard, listings, QR codes, history
├── components/
│   ├── admin/          # Admin-specific components
│   ├── food/           # Food listing cards, filters, portion bars
│   ├── layout/         # Header, navigation, notifications
│   ├── scanner/        # QR code scanning components
│   ├── shared/         # Shared components across user types
│   └── ui/             # Reusable UI components (shadcn/ui)
├── hooks/              # Custom React hooks (auth, mobile, toast)
├── types/              # TypeScript type definitions
└── integrations/       # External service integrations
```

**App.tsx** is the entry point of the frontend application.

Other folders such as **components**, **hooks**, **types**, **utils** contain helper files that make the frontend code more organized and easier to read for ease of collaboration (as recommended by the framework used).

---

## B. Backend

The backend is powered by **Lovable Cloud** (Supabase), providing database, authentication, and serverless functions.

**Edge Functions:** Contains serverless backend functions that handle business logic and external API communication.
- `approve-license` - Handles vendor license approval workflow
- `check-expired-listings` - Automated cleanup of expired food listings
- `create-admin-user` - Admin user creation and management
- `delete-user-account` - User account deletion handling
- `generate-vendor-qr` - QR code generation for vendors
- `process-fake-payment` - Payment processing simulation
- `validate-qr-scan` - QR code validation for food collection

**Database Tables (Models):** Contains the business objects and data structure.
- `food_listings` - Food items with portions, expiry, location
- `reservations` - Consumer and organization reservations
- `user_roles` - Role-based access control (admin, vendor, consumer, organisation)
- `vendor_licenses` - Vendor verification and approval system
- Automated triggers for portion tracking and data synchronization

**Authentication:** Manages user authentication and authorization with role-based access control across four user types (Admin, Vendor, Consumer, Charitable Organization).

**Row Level Security (RLS):** Contains security policies that provide controlled access to data based on user roles and ownership, ensuring data privacy and integrity.

**Storage:** File storage for images and documents (vendor licenses, food listing images).

---

## Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- shadcn/ui (component library)
- React Router (navigation)
- TanStack Query (data fetching)
- React Hook Form + Zod (forms and validation)

**Backend:**
- Lovable Cloud (Supabase)
- PostgreSQL (database)
- Edge Functions (serverless)
- Row Level Security (RLS)
- Realtime subscriptions
