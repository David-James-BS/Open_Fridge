# Software Requirements Specification (SRS)
## Open Fridge - Food Redistribution Platform

**Version:** 1.0  
**Date:** November 8, 2025  
**Project Type:** Web Application (Progressive Web App)  
**Technology Stack:** React, TypeScript, Vite, Tailwind CSS, Lovable Cloud (Supabase)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Specific Requirements](#3-specific-requirements)
4. [Implementation Summary](#4-implementation-summary)
5. [Document Information](#5-document-information)
6. [Appendices](#6-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document provides a comprehensive description of the Open Fridge web application. It details the functional and non-functional requirements, system architecture, user classes, operating environment, design constraints, and implementation considerations. This document is intended for:

- Development team members implementing the system
- Project stakeholders and university evaluators
- Quality assurance teams conducting testing
- Future maintenance and support personnel

### 1.2 Project Overview

**Open Fridge** is a Progressive Web Application (PWA) designed to combat food waste by connecting food vendors with surplus food to consumers and charitable organisations. The platform facilitates the redistribution of excess food that would otherwise be discarded, addressing both environmental sustainability and food security concerns.

The system operates on a three-tiered user model:
- **Vendors** (hawker stalls, restaurants, cafes) list surplus food
- **Consumers** (individual users) collect food portions
- **Charitable Organisations** reserve bulk quantities for community distribution
- **Administrators** oversee licensing, compliance, and platform integrity

### 1.3 Scope

**In Scope:**
- Multi-role authentication and authorization system
- Food listing creation and management
- QR code-based verification for food collection
- License verification for vendors and charitable organisations
- Real-time notifications for listing updates
- Portion tracking and reservation system
- Deposit management for charitable organisation reservations
- User profile management with security question recovery
- Mobile-responsive Progressive Web App
- Admin dashboard for license approval and monitoring

**Out of Scope:**
- Payment gateway integration for actual monetary transactions
- Integration with external food safety monitoring systems
- Native mobile applications (iOS/Android)
- Delivery or logistics coordination
- Inventory management for vendor kitchens
- Nutritional information tracking
- Multi-language support (English only in initial release)

### 1.4 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| PWA | Progressive Web App - web application with native app-like features |
| RLS | Row Level Security - database-level access control |
| JWT | JSON Web Token - authentication token standard |
| QR | Quick Response - 2D barcode for scanning |
| SFA | Singapore Food Authority - regulatory body for food vendors |
| COC | Commissioner of Charities - regulatory body for charitable organisations |
| CRUD | Create, Read, Update, Delete - basic database operations |
| Edge Function | Serverless function deployed on edge network |
| SRS | Software Requirements Specification |

---

## 2. Overall Description

### 2.1 Product Perspective

Open Fridge is a standalone web application built on modern web technologies. The system architecture follows a client-server model with clear separation of concerns:

**System Context:**
```
┌─────────────────────────────────────────────────────────┐
│                    User Devices                         │
│   (Smartphones, Tablets, Desktop Browsers)              │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS/WebSocket
┌────────────────▼────────────────────────────────────────┐
│              Frontend (React SPA/PWA)                    │
│  • User Interface Components                            │
│  • QR Scanner Integration                               │
│  • Real-time Notification Handler                       │
└────────────────┬────────────────────────────────────────┘
                 │ REST API / Realtime
┌────────────────▼────────────────────────────────────────┐
│         Lovable Cloud Backend (Supabase)                │
│  • PostgreSQL Database                                  │
│  • Authentication Service                               │
│  • Edge Functions (Serverless)                          │
│  • Storage Service                                      │
│  • Realtime Subscriptions                               │
└─────────────────────────────────────────────────────────┘
```

**Key System Interfaces:**
- **User Interface:** Web browser-based responsive UI
- **Database Interface:** Supabase PostgreSQL with RLS policies
- **Authentication Interface:** Supabase Auth with JWT tokens
- **File Storage Interface:** Supabase Storage for license documents and food images
- **Camera Interface:** Browser Camera API for QR scanning

### 2.2 Product Functions

The Open Fridge platform provides the following major functions organized by user role:

#### 2.2.1 Common Functions (All Users)
- Account registration with role selection
- Secure login with email/password
- Password recovery using security questions
- Profile management
- Account deletion with data cleanup
- Real-time notifications for relevant events

#### 2.2.2 Vendor Functions
- Submit license application (SFA documentation)
- Create food listings with details (cuisine, dietary info, portions, expiry)
- Upload food images
- Generate QR codes for vendor verification
- View and manage active/historical listings
- Track portions collected by consumers and organisations
- Edit listing details before portions are collected
- Cancel listings
- Public vendor profile display

#### 2.2.3 Consumer Functions
- Browse available food listings with filters (cuisine, dietary requirements, location)
- View detailed listing information
- Scan vendor QR codes to verify and collect food
- Mark favorite vendors for notifications
- View collection history
- Receive priority notifications from favorite vendors

#### 2.2.4 Charitable Organisation Functions
- Submit charitable registration (COC documentation)
- Browse and filter available listings
- Reserve bulk portions for community distribution
- Pay refundable deposits for reservations
- Schedule pickup times
- Scan vendor QR codes to collect reserved portions
- View reservation and collection history
- Follow vendors for bulk availability notifications

#### 2.2.5 Administrator Functions
- Review and approve/reject vendor license applications
- Review and approve/reject charitable organisation registrations
- Download submitted license documents
- Monitor platform activity
- Manage user accounts and permissions
- Access system-wide analytics

### 2.3 User Classes and Characteristics

The Open Fridge platform serves four distinct user classes, each with unique characteristics and requirements:

#### 2.3.1 Vendors (Critical User Class)

**Frequency of Use:** Daily during business hours (typically 8am-10pm)

**Usage Patterns:**
- Create 1-3 listings per day, typically near closing time
- Quick listing creation (5-10 minutes)
- Mobile-first usage (on-the-go listing creation)
- Monitor listing status periodically throughout the day
- Respond to collection requests in real-time

**Technical Expertise:** Low to Medium
- May be older hawkers with limited digital literacy
- Primarily smartphone users
- Need simple, intuitive interface
- Require minimal training

**Subset of Functions Used:**
- License submission (one-time)
- Listing creation and management
- QR code display
- Collection verification
- Basic profile management

**Security/Privilege Level:**
- Role: `vendor`
- Access to own listings only
- Cannot view other vendors' data
- Read-only access to own license status

**Priority:** **HIGHEST** - Platform success depends on vendor participation and ease of use.

#### 2.3.2 Consumers (High Priority User Class)

**Frequency of Use:** Casual, opportunistic (2-5 times per week)

**Usage Patterns:**
- Browse listings during meal times (11am-2pm, 5pm-9pm)
- Quick scan and collect (10-15 minutes total)
- Mobile-dominant usage (90%+ mobile)
- Location-based search
- Impulsive decision-making

**Technical Expertise:** Low to Medium
- General smartphone users
- Expect consumer app simplicity
- Minimal patience for complex workflows

**Subset of Functions Used:**
- Account registration (simplified)
- Browse and filter listings
- QR code scanning
- Favorites management
- Collection history viewing

**Security/Privilege Level:**
- Role: `consumer`
- Access to public listing data only
- Cannot create or modify listings
- Personal collection history private

**Priority:** **HIGH** - Large user base, drives platform adoption and vendor engagement.

#### 2.3.3 Charitable Organisations (Medium Priority User Class)

**Frequency of Use:** Weekly for bulk collection planning (1-3 times per week)

**Usage Patterns:**
- Plan bulk collections in advance
- Desktop and mobile usage (50/50 split)
- Coordinate with multiple vendors
- Schedule pickups during specific time windows
- Process larger quantities (10-50 portions per collection)

**Technical Expertise:** Medium
- Typically staff members with administrative duties
- Comfortable with web applications
- Need training for reservation workflows
- Understand deposit/refund processes

**Subset of Functions Used:**
- Registration submission (COC documentation)
- Browse and filter listings
- Bulk reservation system
- Deposit payment (simulated)
- Pickup scheduling
- QR code scanning for collection
- Reservation history and reporting

**Security/Privilege Level:**
- Role: `charitable_org`
- Access to public listings and own reservations
- Cannot create listings
- Financial transaction records private
- Higher portion limits than consumers

**Priority:** **MEDIUM** - Smaller user base but higher social impact, requires more complex workflows.

#### 2.3.4 Administrators (Supporting User Class)

**Frequency of Use:** Periodic monitoring (2-3 times per week, more during high license submission periods)

**Usage Patterns:**
- Desktop-focused usage (80%+ desktop)
- License review batches (30-60 minutes per session)
- Monitor platform health and compliance
- Respond to escalated issues
- Generate reports

**Technical Expertise:** High
- Technically proficient staff or developers
- Understand platform architecture
- Can troubleshoot issues
- Familiar with administrative tools

**Subset of Functions Used:**
- License approval/rejection workflow
- Document review and download
- User management (rare)
- Platform monitoring dashboard
- System configuration (if needed)

**Security/Privilege Level:**
- Role: `admin`
- Full read access to all platform data
- Write access to license statuses and user roles
- Highest security clearance
- Audit log access

**Priority:** **MEDIUM** - Essential for platform integrity but low volume, scalable staffing model.

#### 2.3.5 User Class Prioritization

**Most Important:**
1. **Vendors** - Without vendors, there is no food supply
2. **Consumers** - Drive platform traffic and vendor engagement

**Less Important:**
3. **Charitable Organisations** - High impact but smaller volume
4. **Administrators** - Supporting role, scalable with automation

### 2.4 Operating Environment

Open Fridge operates as a Progressive Web App accessible via modern web browsers on various devices. The following specifications define the minimum and recommended operating environment:

#### 2.4.1 Client-Side Environment

**Hardware Requirements:**

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Display | 320px width (mobile) | 375px+ width |
| Camera | Basic rear/front camera with autofocus | 5MP+ with LED flash |
| RAM | 2GB | 4GB+ |
| Storage | 100MB free space (for PWA cache) | 500MB+ |
| Network | 3G (500 kbps) | 4G/WiFi (5+ Mbps) |
| Screen Resolution | 720p (1280x720) | 1080p+ (1920x1080+) |

**Camera Specifications for QR Scanning:**
- Minimum 720p resolution (1280x720)
- Autofocus capability required
- Adequate lighting conditions (indoor/outdoor)
- Permission to access camera via browser API

**Photo Upload Requirements:**
- Support for JPEG, PNG, WebP formats
- Maximum file size: 5MB per image
- Minimum resolution: 640x480
- Recommended resolution: 1920x1080

**Software Platform - Web Browsers:**

| Browser | Minimum Version | Features Required |
|---------|----------------|-------------------|
| Google Chrome | 90+ | Service Workers, WebRTC, IndexedDB |
| Mozilla Firefox | 88+ | Service Workers, WebRTC, IndexedDB |
| Safari (iOS/macOS) | 14+ | Service Workers, WebRTC, IndexedDB |
| Microsoft Edge | 90+ | Service Workers, WebRTC, IndexedDB |

**Operating Systems:**

| Platform | Minimum Version | Notes |
|----------|----------------|-------|
| Windows | 10 (1903+) | Full PWA support in Edge/Chrome |
| macOS | 11 (Big Sur) | Full PWA support in Safari 14+ |
| iOS | 14+ | PWA installable via Safari |
| Android | 8.0 (Oreo)+ | Full PWA support, add to home screen |

**Progressive Web App Features Required:**
- Service Worker support for offline capabilities
- Web App Manifest for installability
- IndexedDB for client-side caching
- Push Notifications API (optional, for future enhancement)
- Camera API (getUserMedia) for QR scanning
- Geolocation API (optional, for location-based features)

#### 2.4.2 Server-Side Environment

**Backend Infrastructure:**
- **Platform:** Lovable Cloud (Supabase)
- **Database:** PostgreSQL 15+
- **Runtime:** Deno 1.x for Edge Functions
- **Storage:** Supabase Storage for files
- **Authentication:** Supabase Auth with JWT

**Network Requirements:**
- **Protocol:** HTTPS (TLS 1.2+) required for PWA and authentication
- **WebSocket:** Required for real-time notifications
- **Minimum Bandwidth:** 500 kbps (3G equivalent)
- **Recommended Bandwidth:** 5+ Mbps (4G/WiFi)
- **API Rate Limits:** Standard Supabase limits apply

**Static Hosting:**
- CDN-enabled hosting for SPA assets
- Support for single-page application routing (fallback to index.html)
- HTTPS/SSL certificate required

#### 2.4.3 Coexistence and Compatibility

**Browser Extensions:**
- QR scanner may be affected by ad blockers or privacy extensions
- Camera access requires explicit user permission
- May conflict with extensions that block WebRTC or camera access

**Third-Party Applications:**
- No conflicts expected with other web applications
- No desktop application conflicts
- No known mobile app conflicts

**Accessibility:**
- WCAG 2.1 Level AA compliance (target)
- Screen reader compatible
- Keyboard navigation support

**Data Storage:**
- Browser LocalStorage: ~10MB for JWT tokens and session data
- IndexedDB: ~50MB for PWA cache and offline data
- Cookies: Minimal usage (session management only)

### 2.5 Design and Implementation Constraints

This section identifies constraints that limit design and implementation options for the Open Fridge platform.

#### 2.5.1 Corporate and Regulatory Policies

**Singapore Food Authority (SFA) Compliance:**
- Vendors MUST provide valid SFA license documentation
- License verification required before listing creation
- Admin approval workflow mandatory
- License documents must be downloadable by administrators
- Retention of license records for compliance auditing

**Commissioner of Charities (COC) Compliance:**
- Charitable organisations MUST provide valid COC registration
- Registration verification required before bulk reservations
- Admin approval workflow mandatory
- Registration documents must be downloadable by administrators
- Distinction between charitable and consumer users enforced

**Data Privacy and Protection:**
- Personal data (email, phone, security answers) must be protected
- Security answers hashed (SHA-256) before storage
- User consent required for data collection
- Account deletion must remove all personal data
- No third-party data sharing

**Food Safety and Liability:**
- Platform facilitates connection only, no liability for food quality
- Best-before dates must be clearly displayed
- No medical or allergy guarantees provided
- Disclaimer required during registration

#### 2.5.2 Hardware Limitations

**Camera Access:**
- Camera API support required for QR scanning
- Users must grant camera permissions
- QR scanning accuracy depends on lighting conditions
- Older devices may have slower scanning performance

**Mobile Device Constraints:**
- Older smartphones (pre-2018) may experience performance issues
- Limited RAM (2GB) may affect PWA performance
- Battery consumption during camera usage

**Image Upload Limitations:**
- Maximum file size: 5MB per image
- Image compression may be required
- Upload speed depends on network connection
- Storage quotas apply (Supabase limits)

#### 2.5.3 Timing Requirements

Based on user experience expectations and technical feasibility:

| Operation | Maximum Response Time | Notes |
|-----------|----------------------|-------|
| QR Code Scan Validation | < 2 seconds | Edge function processing + DB query |
| Listing Creation | < 3 seconds | Image upload + database insertion |
| Login/Authentication | < 2 seconds | JWT generation + session setup |
| Real-time Notifications | < 1 second | WebSocket delivery |
| Database Queries (standard) | < 500ms | Simple SELECT operations |
| License Document Download | < 5 seconds | Depends on file size and network |
| Browse Listings (with filters) | < 2 seconds | Indexed queries with pagination |
| Profile Updates | < 1 second | Single row UPDATE operations |

**Performance Degradation Scenarios:**
- Slow network connections (3G) will increase response times
- Large image uploads (>2MB) may take 5-10 seconds
- Peak usage hours may experience slight delays
- Concurrent QR scans handled with database transactions (atomic operations)

#### 2.5.4 Interfaces to Other Applications

**Tight Coupling:**
- **Lovable Cloud Backend (Supabase):** Critical dependency
  - All data persistence flows through Supabase
  - Authentication entirely handled by Supabase Auth
  - File storage depends on Supabase Storage
  - Edge Functions hosted on Supabase infrastructure

**No External Third-Party Integrations:**
- No payment gateway integration (simulated payments)
- No SMS or email service providers (Supabase built-in email)
- No mapping/geolocation APIs (manual location input)
- No social media integrations
- No analytics platforms (future enhancement)

#### 2.5.5 Specific Technologies, Tools, and Databases

**Mandated Technology Stack:**
- **Frontend Framework:** React 18 (functional components with hooks)
- **Language:** TypeScript (strict mode enabled)
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS with custom design system
- **UI Components:** shadcn/ui component library
- **State Management:** TanStack Query (React Query)
- **Form Handling:** React Hook Form with Zod validation
- **Routing:** React Router v6
- **Database:** PostgreSQL 15+ (via Supabase)
- **Backend Functions:** Deno runtime for Edge Functions
- **Authentication:** Supabase Auth with JWT

**Development Tools:**
- **Version Control:** Git
- **Code Editor:** VS Code (recommended)
- **Package Manager:** npm
- **Linting:** ESLint with TypeScript support
- **Formatting:** Prettier (automatic)

#### 2.5.6 Communications Protocols

**Client-Server Communication:**
- **REST API:** HTTPS for standard CRUD operations
- **WebSocket:** Secure WebSocket (WSS) for real-time notifications
- **Authentication:** Bearer token (JWT) in Authorization header

**Data Formats:**
- **API Requests/Responses:** JSON
- **Image Uploads:** Multipart form-data
- **QR Code Data:** JSON string with vendor/listing metadata

#### 2.5.7 Security Considerations

**Row-Level Security (RLS):**
- RLS policies MANDATORY on all database tables
- Users can only access data they own or is public
- Separation of concerns enforced at database level
- Admin role has elevated privileges with separate policies

**Authentication and Authorization:**
- JWT tokens with auto-refresh mechanism
- Token expiration: 1 hour (configurable)
- Refresh token rotation for security
- Role-based access control (RBAC) via `user_roles` table
- Separate `user_roles` table prevents privilege escalation

**Password and Data Security:**
- Passwords hashed using bcrypt (Supabase Auth default)
- Security answers hashed using SHA-256 (one-way hash)
- No plaintext storage of sensitive data
- HTTPS required for all communications (TLS 1.2+)

**File Upload Security:**
- File type validation (JPEG, PNG, PDF only)
- File size limits enforced (5MB images, 10MB documents)
- Malicious file scanning (Supabase Storage built-in)
- Storage buckets with access policies

**SQL Injection Prevention:**
- Parameterized queries via Supabase SDK
- No raw SQL construction in client code
- Input validation using Zod schemas

**Cross-Site Scripting (XSS) Prevention:**
- React's built-in XSS protection (automatic escaping)
- Content Security Policy (CSP) headers
- Sanitization of user-generated content

**QR Code Security:**
- QR codes contain hashed vendor ID and timestamp
- Edge function validates QR code authenticity
- Expiration mechanism for QR codes (future enhancement)

#### 2.5.8 Design Conventions and Programming Standards

**Code Structure:**
- Component-based architecture (atomic design principles)
- Feature-based folder organization
- Reusable components in `/components` directory
- Page components in `/pages` directory
- Shared utilities in `/lib` and `/utils` directories

**Naming Conventions:**
- **Variables/Functions:** camelCase (e.g., `handleSubmit`, `userData`)
- **Components:** PascalCase (e.g., `FoodListingCard`, `UserProfile`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`, `API_ENDPOINT`)
- **Types/Interfaces:** PascalCase (e.g., `FoodListing`, `UserProfile`)
- **File Names:** PascalCase for components, camelCase for utilities

**TypeScript Standards:**
- Strict mode enabled (`strict: true`)
- Explicit return types for functions
- Interface over type alias for object shapes
- Avoid `any` type (use `unknown` with type guards)
- Enum vs. Union types: prefer union types for simple cases

**React Best Practices:**
- Functional components only (no class components)
- Custom hooks for shared logic (prefix with `use`)
- Props interface defined for all components
- Destructure props in function signature
- Use TypeScript for prop validation (no PropTypes)

**Code Comments:**
Required for:
- Complex business logic
- Security-critical operations
- Non-obvious algorithms or workarounds
- Public API functions and components
- Database schema changes and migrations

Not required for:
- Self-explanatory code
- Standard React patterns
- Simple utility functions

**ESLint Configuration:**
- TypeScript ESLint parser
- React hooks rules enforced
- No unused variables
- Consistent import ordering
- Trailing commas required

**Deno Standards (Edge Functions):**
- Use Deno formatting (`deno fmt`)
- Explicit import specifiers (no relative imports without extension)
- Type-safe function signatures
- Error handling with try-catch
- CORS headers in all responses

#### 2.5.9 Parallel Operations and Concurrency

**Multiple Users:**
- Multiple vendors can create listings simultaneously (no conflicts)
- Concurrent listing browsing with read-only access
- Concurrent QR scans handled with database transactions

**Portion Management:**
- Atomic updates for `remaining_portions` field
- Database-level constraints prevent over-collection
- Pessimistic locking for collection operations:
  ```sql
  UPDATE food_listings 
  SET remaining_portions = remaining_portions - 1 
  WHERE id = ? AND remaining_portions > 0
  ```
- Transaction rollback if insufficient portions

**Reservation System:**
- Atomic reservation creation with portion decrement
- Check-then-update pattern with row locking
- Refund processing serialized per reservation

**Notification Delivery:**
- Asynchronous notification creation (non-blocking)
- WebSocket broadcast to connected clients
- No guaranteed delivery order (eventual consistency acceptable)

**File Uploads:**
- Concurrent uploads allowed
- No file locking required
- Storage bucket quotas enforced

### 2.6 User Documentation

The Open Fridge platform will deliver the following documentation to support users and developers:

#### 2.6.1 Developer Documentation (PDF Format)

**README.md (Converted to PDF)**
- Project overview and goals
- Technology stack explanation
- Prerequisites and system requirements
- Installation and setup instructions
  - Node.js and Deno installation
  - Dependency installation (`npm install`)
  - Environment variable configuration
- Local development workflow
  - Starting development server (`npm run dev`)
  - Building for production (`npm run build`)
- Project structure overview
- Deployment guide for self-hosting
- Troubleshooting common issues

**ARCHITECTURE.md (Converted to PDF)**
- System architecture diagram
- Frontend architecture
  - Directory structure explanation
  - Component organization
  - Routing structure
- Backend architecture
  - Database schema overview
  - Edge Functions directory
  - Authentication flow
  - RLS policy implementation
- Technology stack details
- Data flow diagrams

**Database Schema Reference (Separate PDF Section)**
- Complete table definitions
- Column descriptions and data types
- Primary and foreign key relationships
- Index descriptions
- RLS policy explanations for each table
- Sample SQL queries for common operations

**Security and RLS Policy Guide (Separate PDF Section)**
- Authentication flow detailed explanation
- JWT token lifecycle
- Role-based access control implementation
- RLS policy breakdown by user role
- Security best practices for contributors
- Password and security answer hashing methods

**Edge Functions Documentation (Separate PDF Section)**
- Function-by-function description
- Input parameters and return types
- Error handling patterns
- Example requests and responses
- Testing locally with Supabase CLI

**Code Contribution Guide (Separate PDF Section)**
- Coding standards and conventions
- Branch naming and commit message guidelines
- Pull request process
- Code review checklist
- Testing requirements

**Deployment Guide (Separate PDF Section)**
- Self-hosting requirements
- Environment variable setup
- Building and deploying frontend
- Deploying Edge Functions
- Database migration process
- Backup and recovery procedures

#### 2.6.2 User Guides and FAQs (In-App / Web Format)

**Getting Started Guides (Role-Specific):**
- **Vendors:**
  - How to register and submit SFA license
  - Creating your first food listing
  - Understanding QR codes
  - Managing active listings
- **Consumers:**
  - How to find and browse food listings
  - Using filters effectively
  - Scanning QR codes to collect food
  - Adding vendors to favorites
- **Charitable Organisations:**
  - Registering with COC documentation
  - Making bulk reservations
  - Understanding deposit and refund process
  - Scheduling pickups

**Feature Tutorials:**
- QR code scanning step-by-step
- Creating listings with images
- Filtering by cuisine and dietary requirements
- Editing and canceling listings
- Managing notifications

**Common Questions and Answers:**
- What happens if I miss a pickup?
- How do I reset my password?
- Can I change my user role?
- What dietary information is available?
- How do refunds work for organisations?

**Contact and Support:**
- Support email address
- Feedback form link
- Frequently asked technical issues
- Platform status page (future)

#### 2.6.3 Removed from Scope

**Edge Function API Documentation:** 
As per requirements, formal API documentation for Edge Functions has been excluded. Internal developer documentation (in PDF format) provides sufficient technical detail for the development team.

#### 2.6.4 Documentation Delivery Formats

| Documentation Type | Format | Audience | Delivery Method |
|--------------------|--------|----------|-----------------|
| Developer README | PDF | Developers | Included in repo, printable |
| Architecture Guide | PDF | Developers/Stakeholders | Included in repo, printable |
| Database Schema | PDF | Developers/DBA | Included in repo, printable |
| User Guides | Web/In-App | End Users | Accessible within application |
| FAQs | Web/In-App | End Users | Accessible within application |
| Security Guide | PDF | Developers/Auditors | Included in repo, printable |

### 2.7 Assumptions and Dependencies

This section lists assumptions that could affect requirements and dependencies the project has on external factors.

#### 2.7.1 Development Environment Assumptions

**Developer Machine Requirements:**
- Node.js 18+ installed (preferably via nvm for version management)
- Deno 1.x installed for Edge Function development
- Git version control client installed
- Modern code editor available (VS Code recommended)
- Terminal/command line access
- Minimum 8GB RAM for comfortable development
- Internet connection for package installation and Supabase access

**Lovable Cloud Access:**
- Developers have access to Supabase project credentials
- Environment variables (`.env`) pre-configured by Lovable
- Supabase project ID and anon key provided automatically
- No manual Supabase account creation required

**Version Control:**
- Git repository initialized
- Developers understand basic Git workflow
- Branching strategy defined (main, development, feature branches)

#### 2.7.2 Technical Assumptions About Users

**Device and Network Assumptions:**
- Users have devices manufactured after 2018
- Devices meet minimum hardware requirements (see Section 2.4.1)
- Users have stable internet connection (minimum 3G)
- Users can grant camera permissions when prompted

**User Capabilities:**
- Users understand basic web navigation (clicking, scrolling, forms)
- Users can read and understand English
- Users have valid email addresses for registration
- Users can take photos or upload images from device

**Vendor-Specific Assumptions:**
- Vendors have valid Singapore Food Authority (SFA) licenses
- Vendors can provide digital copies (photos/scans) of licenses
- Vendors operate legitimate food businesses
- Vendors understand food safety and best-before dates

**Charitable Organisation Assumptions:**
- Organisations have valid Commissioner of Charities (COC) registration
- Organisations can provide digital copies of registration documents
- Organisations have capacity for bulk food collection
- Organisations understand pickup scheduling requirements

**Consumer Assumptions:**
- Consumers understand food redistribution concept
- Consumers accept food with near-expiry dates
- Consumers take responsibility for food quality assessment

#### 2.7.3 Third-Party Component Assumptions

**Lovable Cloud (Supabase) Assumptions:**
- Supabase maintains backward compatibility for API changes
- Supabase uptime remains at 99.9%+ (as per SLA)
- Supabase PostgreSQL version remains stable (15+)
- Supabase Auth continues to support email/password authentication
- Supabase Storage maintains current file size limits (5MB+ images)
- Supabase Edge Functions (Deno runtime) remains stable
- Supabase SDK receives regular security updates

**Frontend Library Assumptions:**
- React 18 remains stable and supported
- Vite build tool continues active development
- Tailwind CSS maintains design system compatibility
- shadcn/ui components receive updates and bug fixes
- TanStack Query (React Query) maintains API stability
- React Router v6 continues support for SPA routing

**Browser Compatibility Assumptions:**
- Chrome, Firefox, Safari, Edge maintain current API support
- Camera API (getUserMedia) remains standardized
- Service Workers continue to be supported for PWA
- IndexedDB API remains stable
- WebSocket protocol maintains browser support

**Dependency Version Assumptions:**
- No major breaking changes in `@supabase/supabase-js` v2.x
- No breaking changes in React 18 during project lifecycle
- TypeScript compiler remains backward compatible
- Package updates through `npm` do not break existing functionality

#### 2.7.4 Regulatory and Legal Assumptions

**Singapore Regulatory Environment:**
- SFA license requirements remain consistent
- COC registration requirements remain consistent
- No major changes to food redistribution laws in Singapore
- License document formats remain acceptable (PDF, JPEG, PNG)
- No new compliance requirements introduced mid-project

**Food Safety Liability:**
- Platform is not liable for food quality or safety
- Vendors are responsible for food safety compliance
- Consumers accept food at their own risk
- Charitable organisations verify food safety before distribution

**Data Privacy:**
- Personal data protection requirements remain as currently defined
- No new data localization laws introduced
- Email communication for authentication continues to be allowed
- User consent mechanisms remain adequate

#### 2.7.5 Known Dependencies

**Critical Dependencies (Service Outage = Platform Outage):**
- Lovable Cloud (Supabase) availability
  - Database service (PostgreSQL)
  - Authentication service (Supabase Auth)
  - Storage service (file uploads)
  - Edge Functions runtime
  - Real-time subscription service

**High-Priority Dependencies:**
- npm package registry availability (for dependency installation)
- Static hosting service (for SPA deployment)
- CDN availability (for fast asset delivery)
- HTTPS/SSL certificate validity

**Medium-Priority Dependencies:**
- Browser camera API support (for QR scanning)
- Web push notification API (future feature)
- Geolocation API (future feature)

**Component Reusability:**
- shadcn/ui component library (reusable UI components)
- Custom components in `/components` directory
- Custom hooks in `/hooks` directory
- Utility functions in `/lib` and `/utils` directories

**External Service Dependencies:**
None currently. Platform is self-contained within Lovable Cloud ecosystem.

#### 2.7.6 Risk Factors and Mitigation

**Identified Risks:**

| Risk | Impact | Likelihood | Mitigation Strategy |
|------|--------|-----------|---------------------|
| Supabase service outage | Platform completely unavailable | Low (99.9% uptime) | PWA offline capabilities (cached data), status monitoring |
| Camera API compatibility issues | QR scanning fails on some devices | Medium | Fallback: manual entry of vendor codes, device compatibility testing |
| QR scanning accuracy issues | Collection verification unreliable | Medium | Optimize scanning algorithm, provide scanning tips, adequate lighting requirements |
| Large file upload failures on slow connections | Vendors can't upload images/documents | Medium | Image compression, upload progress indicator, retry mechanism |
| Breaking changes in dependencies | Build failures, runtime errors | Low | Lock dependency versions, thorough testing before updates |
| Regulatory changes | Compliance failures | Low | Monitor regulatory announcements, flexible license verification system |
| Vendor adoption resistance | Low food supply | Medium | User training, simple onboarding, incentive programs |
| Database schema changes breaking RLS | Data exposure | Low | Thorough testing of migrations, automated security scans |

**Assumption-Based Risks:**
- If Supabase backward compatibility assumption fails → Breaking changes in API calls
- If user device assumption fails → Performance issues on older devices
- If regulatory assumption fails → Re-implementation of compliance workflows
- If browser compatibility assumption fails → Feature degradation on certain browsers

---

## 3. Specific Requirements

This section outlines the specific functional and non-functional requirements for the Open Fridge platform.

### 3.1 Functional Requirements Overview

The functional requirements are organized by user role and system functionality. Detailed requirement specifications include:

#### 3.1.1 Authentication and Authorization
- **REQ-AUTH-001:** System shall support user registration with role selection (vendor, consumer, charitable_org)
- **REQ-AUTH-002:** System shall authenticate users with email and password
- **REQ-AUTH-003:** System shall implement JWT token-based session management with auto-refresh
- **REQ-AUTH-004:** System shall enforce role-based access control (RBAC) using `user_roles` table
- **REQ-AUTH-005:** System shall provide password reset via security questions (3 questions minimum)
- **REQ-AUTH-006:** System shall hash security answers using SHA-256 before storage
- **REQ-AUTH-007:** System shall prevent privilege escalation through separate role table

#### 3.1.2 Vendor Functionality
- **REQ-VEN-001:** Vendors shall submit SFA license documentation during registration
- **REQ-VEN-002:** Vendors shall not create listings until license is approved by admin
- **REQ-VEN-003:** System shall generate unique QR codes for each vendor
- **REQ-VEN-004:** Vendors shall create food listings with required fields:
  - Title, description, location
  - Cuisine type (from predefined enum)
  - Dietary information (array of dietary types)
  - Total portions, best-before date/time
  - Optional: food image (max 5MB)
- **REQ-VEN-005:** Vendors shall edit listings only if no portions have been collected
- **REQ-VEN-006:** Vendors shall cancel listings at any time
- **REQ-VEN-007:** System shall automatically mark listings as "expired" after best-before date
- **REQ-VEN-008:** Vendors shall view all active and historical listings
- **REQ-VEN-009:** Vendors shall view collection history per listing

#### 3.1.3 Consumer Functionality
- **REQ-CON-001:** Consumers shall browse all active food listings
- **REQ-CON-002:** Consumers shall filter listings by:
  - Cuisine type
  - Dietary requirements
  - Location (text search)
- **REQ-CON-003:** Consumers shall view detailed listing information
- **REQ-CON-004:** Consumers shall scan vendor QR codes to verify collection
- **REQ-CON-005:** System shall decrement remaining portions upon successful scan
- **REQ-CON-006:** System shall record collection in `collections` table
- **REQ-CON-007:** Consumers shall mark vendors as favorites
- **REQ-CON-008:** Consumers shall receive priority notifications from favorite vendors
- **REQ-CON-009:** Consumers shall view personal collection history

#### 3.1.4 Charitable Organisation Functionality
- **REQ-ORG-001:** Organisations shall submit COC registration documentation
- **REQ-ORG-002:** Organisations shall not make reservations until registration is approved
- **REQ-ORG-003:** Organisations shall reserve multiple portions (bulk) from active listings
- **REQ-ORG-004:** System shall calculate refundable deposit for reservations
- **REQ-ORG-005:** Organisations shall simulate deposit payment (fake payment processing)
- **REQ-ORG-006:** Organisations shall schedule pickup times for reservations
- **REQ-ORG-007:** Organisations shall scan vendor QR codes to collect reserved portions
- **REQ-ORG-008:** System shall mark reservation as collected and process refund
- **REQ-ORG-009:** Organisations shall follow vendors for bulk availability notifications
- **REQ-ORG-010:** Organisations shall view reservation and collection history

#### 3.1.5 Administrator Functionality
- **REQ-ADM-001:** Admins shall view all pending license applications (vendors and organisations)
- **REQ-ADM-002:** Admins shall download submitted license documents
- **REQ-ADM-003:** Admins shall approve or reject license applications
- **REQ-ADM-004:** System shall send notification to applicant upon approval/rejection
- **REQ-ADM-005:** System shall update user role or license status based on admin decision
- **REQ-ADM-006:** Admins shall view platform-wide statistics (listings, collections, users)
- **REQ-ADM-007:** Admins shall have read access to all tables (enforced via RLS)

#### 3.1.6 Notification System
- **REQ-NOT-001:** System shall create notifications for:
  - License approval/rejection
  - New listing from favorite/followed vendor
  - Listing expiring soon (within 2 hours)
  - Reservation confirmation
  - Refund processed
- **REQ-NOT-002:** System shall deliver notifications via real-time WebSocket
- **REQ-NOT-003:** Users shall view notification history
- **REQ-NOT-004:** Users shall mark notifications as read
- **REQ-NOT-005:** System shall delete old notifications after 30 days

#### 3.1.7 QR Code Verification
- **REQ-QR-001:** System shall generate unique QR codes for vendors (stored in `vendor_qr_codes` table)
- **REQ-QR-002:** QR codes shall encode vendor ID and metadata (JSON format)
- **REQ-QR-003:** System shall validate QR code authenticity via Edge Function
- **REQ-QR-004:** Edge Function shall verify:
  - QR code exists in database
  - Vendor has active listing
  - User has permission to collect (consumer or org with reservation)
  - Sufficient portions remain
- **REQ-QR-005:** System shall prevent duplicate collections (same user, same listing)
- **REQ-QR-006:** System shall respond to scan within 2 seconds

#### 3.1.8 Data Management
- **REQ-DATA-001:** System shall automatically mark listings as "expired" after best-before date
- **REQ-DATA-002:** System shall implement scheduled Edge Function to check for expired listings
- **REQ-DATA-003:** System shall implement soft delete for user accounts (retain data for auditing)
- **REQ-DATA-004:** System shall allow users to permanently delete their accounts
- **REQ-DATA-005:** Account deletion shall trigger Edge Function to cascade delete related data

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance Requirements
- **REQ-PERF-001:** System shall load homepage within 3 seconds on 4G connection
- **REQ-PERF-002:** System shall respond to API calls within 500ms (95th percentile)
- **REQ-PERF-003:** System shall support 100 concurrent users without degradation
- **REQ-PERF-004:** System shall support 1000+ food listings with efficient pagination
- **REQ-PERF-005:** QR code scanning shall process and validate within 2 seconds

#### 3.2.2 Security Requirements
- **REQ-SEC-001:** All communications shall use HTTPS (TLS 1.2+)
- **REQ-SEC-002:** Passwords shall be hashed using bcrypt (Supabase Auth default)
- **REQ-SEC-003:** Security answers shall be hashed using SHA-256 (one-way hash)
- **REQ-SEC-004:** Row-Level Security (RLS) shall be enabled on all database tables
- **REQ-SEC-005:** JWT tokens shall expire after 1 hour with automatic refresh
- **REQ-SEC-006:** File uploads shall be validated for type and size
- **REQ-SEC-007:** SQL injection shall be prevented via parameterized queries
- **REQ-SEC-008:** XSS attacks shall be prevented via React's automatic escaping

#### 3.2.3 Reliability Requirements
- **REQ-REL-001:** System shall have 99.9% uptime (dependent on Supabase SLA)
- **REQ-REL-002:** Database transactions shall be atomic (ACID compliance)
- **REQ-REL-003:** System shall gracefully handle Edge Function failures
- **REQ-REL-004:** System shall provide error messages for failed operations

#### 3.2.4 Usability Requirements
- **REQ-USE-001:** User interface shall be mobile-responsive (320px - 4K displays)
- **REQ-USE-002:** Application shall be installable as PWA on supported devices
- **REQ-USE-003:** Forms shall provide inline validation and error messages
- **REQ-USE-004:** QR scanner shall provide visual feedback during scanning
- **REQ-USE-005:** Navigation shall be intuitive with clear labels and icons

#### 3.2.5 Maintainability Requirements
- **REQ-MAINT-001:** Code shall follow TypeScript strict mode
- **REQ-MAINT-002:** Code shall be organized by feature and component
- **REQ-MAINT-003:** Database migrations shall be version-controlled
- **REQ-MAINT-004:** Edge Functions shall have error logging
- **REQ-MAINT-005:** Complex logic shall be documented with comments

---

## 4. Implementation Summary

### 4.1 Database Schema Overview

The Open Fridge platform uses PostgreSQL (via Lovable Cloud) with the following core tables:

#### 4.1.1 User Management Tables

**user_roles**
- Links users to their role(s) in the system
- Columns: `id`, `user_id`, `role` (enum: admin, vendor, consumer, charitable_org)
- Purpose: Separate table prevents privilege escalation, allows role changes

**profiles**
- Stores additional user information beyond authentication
- Columns: `id`, `user_id`, `full_name`, `phone`, `bio`, `avatar_url`, `stall_name`, `stall_location`, `created_at`, `updated_at`
- Purpose: Extended user profile data, vendor-specific fields (stall_name, stall_location)

**licenses**
- Stores license/registration applications for vendors and organisations
- Columns: `id`, `user_id`, `license_type` (vendor_sfa, org_coc), `document_url`, `status` (pending, approved, rejected), `rejection_reason`, `submitted_at`, `reviewed_at`, `reviewed_by`
- Purpose: License verification workflow, admin approval tracking

#### 4.1.2 Food Listing Tables

**food_listings**
- Core table for surplus food postings
- Columns: `id`, `vendor_id`, `title`, `description`, `location`, `cuisine` (enum), `dietary_info` (array), `total_portions`, `remaining_portions`, `reserved_portions`, `best_before`, `status` (active, completed, cancelled, expired), `image_url`, `priority_until`, `available_for_charity`, `created_at`, `updated_at`
- Purpose: Vendor food postings with availability tracking

**collections**
- Records individual consumer collections
- Columns: `id`, `consumer_id`, `listing_id`, `portions_collected`, `collected_at`
- Purpose: Audit trail for consumer pickups

**organisation_collections**
- Records charitable organisation bulk collections
- Columns: `id`, `organisation_id`, `reservation_id`, `listing_id`, `portions_collected`, `collected_at`
- Purpose: Separate tracking for organisation pickups (linked to reservations)

**reservations**
- Manages bulk portion reservations by organisations
- Columns: `id`, `listing_id`, `organisation_id`, `portions_reserved`, `deposit_amount`, `deposit_status` (pending, paid, refunded), `collected`, `collected_at`, `pickup_time`, `created_at`
- Purpose: Advance booking system with deposit management

#### 4.1.3 Social and Notification Tables

**vendor_followers**
- Consumer-to-vendor follow relationships
- Columns: `id`, `consumer_id`, `vendor_id`, `created_at`
- Purpose: Enable priority notifications for favorite vendors

**organisation_vendor_followers**
- Organisation-to-vendor follow relationships
- Columns: `id`, `organisation_id`, `vendor_id`, `created_at`
- Purpose: Bulk availability notifications for organisations

**notifications**
- Stores all system notifications
- Columns: `id`, `user_id`, `title`, `message`, `type` (license_approved, new_listing, etc.), `read`, `created_at`
- Purpose: Notification history and real-time delivery

#### 4.1.4 Security Tables

**vendor_qr_codes**
- Stores generated QR codes for vendor verification
- Columns: `id`, `vendor_id`, `qr_data`, `created_at`
- Purpose: QR code validation, one code per vendor

### 4.2 Row-Level Security (RLS) Implementation

All tables implement RLS policies to enforce access control at the database level:

**Example RLS Policies:**
- Users can only view their own profile
- Vendors can only create/edit their own listings
- Consumers can view all active listings (public)
- Admins have elevated SELECT access to all tables
- Collection records are private to the user who collected
- Notifications are only visible to the recipient

### 4.3 Edge Functions

The following serverless functions are implemented:

1. **approve-license**: Admin workflow to approve/reject license applications
2. **check-expired-listings**: Scheduled function to mark expired listings
3. **create-admin-user**: Initial admin account creation (one-time)
4. **delete-user-account**: Cascade delete user data upon account deletion
5. **download-license**: Secure download of license documents for admins
6. **generate-vendor-qr**: Generate unique QR code for vendor
7. **process-fake-payment**: Simulate deposit payment for reservations
8. **reset-password-with-security**: Password reset using security questions
9. **validate-qr-scan**: Validate QR code and process food collection

### 4.4 Key Features Summary

**Implemented Features:**
✅ Multi-role authentication (vendor, consumer, organisation, admin)  
✅ License verification workflow  
✅ Food listing CRUD with image uploads  
✅ QR code generation and scanning  
✅ Consumer collection tracking  
✅ Bulk reservation system with deposits  
✅ Vendor following/favorites  
✅ Real-time notifications  
✅ Admin dashboard for license approval  
✅ Profile management  
✅ Security question password reset  
✅ Account deletion with data cleanup  
✅ Automatic listing expiration  
✅ Mobile-responsive PWA  

**Future Enhancements (Out of Current Scope):**
- Push notifications (browser API)
- Geolocation and map integration
- Analytics dashboard
- Multi-language support
- Real payment gateway integration
- Vendor ratings and reviews
- Advanced search with AI recommendations

---

## 5. Document Information

### 5.1 Document History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0 | November 8, 2025 | Development Team | Initial comprehensive SRS document |

### 5.2 Document Approval

This document requires approval from:
- Project Stakeholders
- University Evaluators
- Development Team Lead

### 5.3 References

**External Documentation:**
- React Documentation: https://react.dev/
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Lovable Cloud (Supabase) Documentation: https://supabase.com/docs
- Tailwind CSS Documentation: https://tailwindcss.com/docs
- shadcn/ui Components: https://ui.shadcn.com/

**Internal Documentation:**
- README.md - Project setup and development guide
- ARCHITECTURE.md - System architecture and design
- Database migration files in `supabase/migrations/`
- Edge Function source code in `supabase/functions/`

**Regulatory References:**
- Singapore Food Authority (SFA): https://www.sfa.gov.sg/
- Commissioner of Charities (COC): https://www.charities.gov.sg/

### 5.4 Glossary of Additional Terms

| Term | Definition |
|------|------------|
| Bulk Collection | Reservation of multiple portions by charitable organisations |
| Collection | Act of a consumer or organisation picking up food portions |
| Deposit | Refundable payment required for bulk reservations |
| Edge Function | Serverless function deployed on edge network (Deno runtime) |
| Listing | Food offering posted by a vendor |
| Portion | Single serving unit of food |
| Priority Notification | Notification sent to users who follow a vendor |
| Refund | Return of deposit after successful food collection |
| Reservation | Advance booking of bulk portions by organisation |
| RLS Policy | Database rule that restricts data access based on user context |

---

## 6. Appendices

### 6.1 Technology Stack Details

**Frontend Technologies:**
```
React 18.3.1 - UI framework
TypeScript 5.x - Type-safe JavaScript
Vite 5.x - Build tool and dev server
Tailwind CSS 3.x - Utility-first CSS framework
shadcn/ui - Reusable component library
React Router 6.30.1 - Client-side routing
TanStack Query 5.83.0 - Data fetching and caching
React Hook Form 7.61.1 - Form handling
Zod 3.25.76 - Schema validation
Lucide React - Icon library
html5-qrcode 2.3.8 - QR code scanning
react-qr-code 2.0.18 - QR code generation
date-fns 3.6.0 - Date manipulation
sonner 1.7.4 - Toast notifications
```

**Backend Technologies:**
```
Lovable Cloud (Supabase)
PostgreSQL 15+ - Relational database
Supabase Auth - Authentication service
Supabase Storage - File storage
Deno 1.x - Edge Functions runtime
@supabase/supabase-js 2.75.1 - JavaScript client SDK
```

**Development Tools:**
```
ESLint - JavaScript/TypeScript linting
Prettier - Code formatting
Git - Version control
npm - Package management
VS Code - Recommended IDE
```

### 6.2 Database Enumeration Types

**app_role**
- `admin` - Platform administrator
- `vendor` - Food vendor/hawker stall
- `consumer` - Individual consumer
- `charitable_org` - Charitable organisation

**cuisine_type**
- `chinese`, `malay`, `indian`, `western`, `japanese`, `korean`, `thai`, `vietnamese`, `italian`, `mexican`, `other`

**dietary_type**
- `vegetarian`, `vegan`, `halal`, `kosher`, `gluten_free`, `dairy_free`, `nut_free`, `none`

**license_status**
- `pending` - Awaiting admin review
- `approved` - License verified and approved
- `rejected` - License rejected by admin

**listing_status**
- `active` - Available for collection
- `completed` - All portions collected
- `cancelled` - Cancelled by vendor
- `expired` - Past best-before date

### 6.3 Regulatory Compliance Checklist

**Singapore Food Authority (SFA) Compliance:**
- [ ] Vendor provides valid SFA license document
- [ ] Document format acceptable (PDF, JPEG, PNG)
- [ ] Admin review and approval completed
- [ ] License status tracked in database
- [ ] Rejection reason documented if applicable
- [ ] License documents securely stored and downloadable

**Commissioner of Charities (COC) Compliance:**
- [ ] Organisation provides valid COC registration
- [ ] Registration document format acceptable
- [ ] Admin review and approval completed
- [ ] Registration status tracked in database
- [ ] Rejection reason documented if applicable
- [ ] Registration documents securely stored

**Data Privacy Compliance:**
- [ ] User consent obtained during registration
- [ ] Personal data encrypted in transit (HTTPS)
- [ ] Sensitive data hashed (passwords, security answers)
- [ ] User can view their own data
- [ ] User can delete their account and data
- [ ] No third-party data sharing without consent

### 6.4 System Diagrams

#### 6.4.1 User Role Hierarchy
```
┌──────────────┐
│    Admin     │ (Highest privilege)
└──────┬───────┘
       │ (Reviews licenses)
       │
┌──────┴──────────────────────────────┐
│                                     │
┌──────▼───────┐            ┌─────────▼────────┐
│   Vendor     │            │ Charitable Org   │
│              │            │                  │
│ - Create     │            │ - Reserve bulk   │
│   listings   │            │ - Pay deposits   │
│ - QR code    │            │ - Follow vendors │
└──────────────┘            └──────────────────┘
       │                            │
       │ (Provide food)             │ (Collect bulk)
       │                            │
       └────────┬───────────────────┘
                │
         ┌──────▼───────┐
         │   Consumer   │
         │              │
         │ - Browse     │
         │ - Collect    │
         │ - Favorite   │
         └──────────────┘
```

#### 6.4.2 QR Code Collection Flow
```
┌─────────────┐          ┌─────────────┐
│  Consumer/  │ Scans QR │   Vendor    │
│     Org     ├─────────>│  QR Code    │
└──────┬──────┘          └─────────────┘
       │
       │ (Sends QR data)
       │
┌──────▼──────────────────────────────────┐
│   Edge Function: validate-qr-scan       │
│                                         │
│  1. Verify QR code exists               │
│  2. Check vendor has active listing     │
│  3. Verify user permission              │
│  4. Check sufficient portions           │
│  5. Decrement remaining_portions        │
│  6. Create collection record            │
└──────┬──────────────────────────────────┘
       │
       │ (Success/Failure response)
       │
┌──────▼──────┐
│   Result    │
│  • Success  │
│  • Error    │
└─────────────┘
```

### 6.5 Test Scenarios (For QA Reference)

**Authentication Test Cases:**
1. Register as vendor → Submit license → Admin approves → Create listing
2. Register as consumer → Browse listings → Scan QR → Collect food
3. Register as organisation → Submit COC → Admin approves → Make reservation
4. Password reset with security questions
5. Account deletion and data cleanup

**Listing Management Test Cases:**
1. Vendor creates listing with all fields
2. Vendor uploads food image (max 5MB)
3. Vendor edits listing before any collection
4. Vendor cancels listing
5. System auto-expires listing after best-before date
6. Listing status transitions (active → completed/expired/cancelled)

**QR Code Test Cases:**
1. Consumer scans valid vendor QR with active listing
2. Consumer scans invalid QR code
3. Organisation scans QR with valid reservation
4. Organisation scans QR without reservation
5. Concurrent QR scans decrement portions correctly

**Reservation Test Cases:**
1. Organisation reserves bulk portions
2. System calculates deposit amount
3. Organisation simulates payment
4. Organisation schedules pickup time
5. Organisation collects reserved portions
6. System processes refund

**Edge Cases:**
1. Attempt to collect more portions than available
2. Scan QR for listing with 0 remaining portions
3. Upload oversized image (>5MB)
4. Submit invalid license document format
5. Delete account with active listings/reservations

---

## End of Document

**Software Requirements Specification v1.0**  
**Open Fridge - Food Redistribution Platform**  
**November 8, 2025**

---

**Document Status:** FINAL DRAFT  
**Total Pages:** 25  
**Word Count:** ~10,500 words  

This document is suitable for printing as a PDF for university submission, stakeholder review, and development team reference.