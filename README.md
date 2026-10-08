# Vishwakarma Fabrication CRM

> **Offline-first Android CRM for welding and fabrication workshop operations**

Vishwakarma Fabrication CRM is a purpose-built Android application for managing the complete day-to-day customer and job workflow of a welding/fabrication workshop. The application is designed around an **offline-first local SQLite data model**, so core business records remain available on the device without requiring a continuous internet connection.

The system connects the complete operational flow:

**Lead → Customer → Job/Sale → Payment → Invoice → Reports**

The goal is simple: replace scattered notebooks, chat messages, manual calculations, and disconnected payment records with one structured workshop management system.

---

## Product Overview

The CRM provides a focused business workflow for small workshop and fabrication businesses.

### Core modules

- **Dashboard**
  - Total collection
  - Pending amount
  - Revenue
  - Sales/job count
  - Customer count
  - Lead count
  - Lead pipeline overview
  - Recent activity
  - Sales overview
  - Offline status indicator
  - Quick actions for common operations

- **Lead Management**
  - Create and edit leads
  - Customer name and phone
  - Lead source
  - Lead details
  - Follow-up date
  - Pipeline/stage management
  - Search by name, phone, or source
  - Convert qualified leads into customers
  - Delete unused leads
  - Transaction-safe lead conversion

- **Customer Management**
  - Customer directory
  - Customer profile
  - Total work/sales value
  - Paid amount
  - Pending amount
  - Sale/job count
  - Work history
  - Payment history
  - Invoice history
  - Lifetime work summary
  - Total discount
  - Average job value
  - Discount rate
  - Last job information
  - Start a new job directly from a customer
  - Safe customer deletion with linked local-data cleanup

- **Job / Sales Management**
  - Customer selection
  - Work/job description
  - Original amount
  - Discount
  - Final amount
  - Paid amount
  - Pending amount
  - Payment status
  - Customer-linked job history

- **Payment Management**
  - Record payments against jobs
  - Payment amount validation
  - Payment method tracking
  - Payment screenshot attachment
  - Local payment-asset storage
  - Payment history
  - Overpayment protection
  - WhatsApp payment summary
  - Payment data consistency checks

- **Invoice Management**
  - Offline invoice generation
  - Invoice number
  - Invoice date
  - Business name and owner
  - Business logo
  - Customer name and phone
  - Work description
  - Original amount
  - Discount
  - Final amount
  - Paid amount
  - Pending amount
  - Terms and conditions
  - Signature
  - Safe local file handling
  - HTML escaping for invoice-generated content

- **Reports**
  - Revenue
  - Collection
  - Pending amount
  - Sales count
  - Payment-method breakdown
  - Monthly performance
  - Monthly revenue
  - Monthly collection
  - Monthly sales
  - Monthly pending amount

- **Company Settings**
  - Business name
  - Owner name
  - Invoice terms
  - Company logo
  - Signature

---

## End-to-End Business Workflow

### 1. Capture a Lead
A new enquiry can be stored with contact information, source, details, and follow-up information.

### 2. Qualify the Lead
Leads can be moved through defined stages and searched when follow-up is required.

### 3. Convert to Customer
A qualified lead can be converted into a customer using a transaction-safe workflow, avoiding partial conversion states.

### 4. Create a Job
The customer can be linked to a new welding/fabrication job with amount and discount information.

### 5. Track Payments
Payments are recorded against the job with method and optional proof/screenshot. The system protects against invalid over-collection.

### 6. Generate an Invoice
The job's financial information can be used to generate an offline invoice with workshop branding and customer details.

### 7. Review Business Performance
Dashboard and reports provide visibility into revenue, collection, pending amounts, jobs, customers, leads, and payment methods.

---

## Reliability & Data Integrity

The application is not built around a collection of loose UI screens. Core financial and relational operations are protected at the data layer.

Implemented safeguards include:

- SQLite schema versioning and migrations
- Database triggers for relevant integrity rules
- Exclusive transactions for critical sales/payment operations
- Transaction-safe lead-to-customer conversion
- Payment/customer/sale relationship validation
- Overpayment rejection
- Affected-row checks after critical updates
- Date, phone, and monetary-value validation
- Duplicate-lead prevention
- Local file cleanup when related records are removed
- Invoice file rollback protection
- Company-asset lifecycle cleanup
- Safe file-extension handling for payment attachments
- HTML escaping for invoice-generated content

These controls are intended to reduce inconsistent records, invalid financial states, and orphaned local files during normal application use.

---

## Offline-First Architecture

The application is designed for workshop environments where internet connectivity should not be a prerequisite for basic business operations.

Core business data is stored locally using SQLite. This covers the primary CRM records and operational workflows, including:

- Leads
- Customers
- Jobs / sales
- Payments
- Invoice-related data
- Company settings

Local file assets such as payment screenshots and company assets are also managed with explicit lifecycle handling.

**Important scope boundary:** this release is offline-first and does not claim cloud synchronization, multi-device synchronization, server-side backup, or multi-user access control.

---

## Release & Engineering Quality

The current application release is:

**Version:** 1.0.2  
**Platform:** Android  
**Application:** Vishwakarma Fabrication CRM

The repository includes an Android release workflow covering:

1. Dependency installation
2. Static JavaScript validation
3. Expo project validation
4. Dependency compatibility validation
5. Native project generation
6. Android release APK build
7. Build artifact upload

The latest verified release pipeline completed successfully after the current branding/release updates.

---

## UI / Product Experience

The application is organized around the real operating sequence of a fabrication workshop rather than generic enterprise CRM terminology.

The main navigation exposes:

- Dashboard
- Leads
- Customers
- Sales / Jobs
- Payments
- More
- Reports
- Company Settings

The startup experience uses Vishwakarma Fabrication branding with the **VF** identity.

---

## What This Product Solves

Without a structured CRM, workshop information can become fragmented across:

- Paper notebooks
- WhatsApp conversations
- Phone contacts
- Separate payment notes
- Manual calculations
- Individual invoice files
- Memory

This CRM centralizes the operational record so that a customer, their jobs, payments, invoices, and history remain connected.

### Business impact

**Before**

- Lead information scattered
- Customer history difficult to retrieve
- Manual payment calculations
- Pending amounts easy to lose track of
- Invoice preparation handled separately
- Limited visibility into monthly performance

**With the CRM**

- Leads have a defined pipeline
- Customers have a persistent work history
- Jobs and payments remain connected
- Paid and pending amounts are calculated from recorded payment data
- Invoices can be generated from job information
- Reports provide operational visibility
- Core records remain available offline

---

## Current Scope

### Included

- Offline-first CRM
- Lead pipeline
- Customer management
- Job/sales management
- Payment tracking
- Payment proof attachments
- Invoice generation
- WhatsApp payment summary
- Business branding
- Reports
- Local SQLite persistence
- Data-integrity protections
- Android release workflow

### Not Included in the Current Release

To keep the product scope technically honest, the current release does **not** claim:

- Cloud synchronization
- Multi-device synchronization
- User accounts / role-based access
- Server-side database
- Automatic cloud backup
- Inventory management
- GST/accounting integration
- Online payment gateway
- iOS production release
- Enterprise multi-tenant infrastructure

These can be treated as future product extensions rather than pretending they already exist. Humanity has enough software that does that.

---

## Release Readiness Summary

| Area | Status |
|---|---|
| Core CRM workflow | Implemented |
| Lead management | Implemented |
| Customer management | Implemented |
| Job / sales management | Implemented |
| Payment tracking | Implemented |
| Invoice workflow | Implemented |
| Reports | Implemented |
| Company branding | Implemented |
| Offline local database | Implemented |
| Financial validation | Implemented |
| Local asset lifecycle handling | Implemented |
| Static validation | Passed |
| Expo validation | Passed |
| Android release build | Passed |
| CI artifact generation | Passed |

---

## Screenshots

Screenshots should be added here from the verified Android APK/build so the repository documentation shows the actual product UI rather than mockups.

Recommended evidence set:

1. **Dashboard** — KPI cards, pipeline, recent activity
2. **Lead Pipeline** — lead stages and follow-up workflow
3. **Customer Profile** — customer summary and work history
4. **Job / Sale** — amount, discount, paid and pending values
5. **Payment** — payment method, amount and proof attachment
6. **Invoice** — branded invoice output
7. **Reports** — revenue, collection and monthly performance
8. **Company Settings** — logo, signature and invoice configuration

---

## Technical Position

Vishwakarma Fabrication CRM is intentionally focused rather than overloaded with unrelated enterprise features.

Its strongest technical characteristics are:

- Offline-first operation
- Local transactional data model
- Explicit financial validation
- Connected CRM-to-payment workflow
- Local invoice generation
- Controlled file lifecycle
- Release validation through CI
- Workshop-specific operational design

The product is suitable as a focused Android CRM foundation for a welding/fabrication workshop and can be extended as the business workflow grows.

---

## Version

**Vishwakarma Fabrication CRM — v1.0.2**

**Android package:** `com.weldingworkshop.crm`

**Release status:** Android release build successfully verified through CI.
