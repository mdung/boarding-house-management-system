# Boarding House Management System

A full-stack web application for managing boarding houses, tenants, contracts, invoices, and payments.

## Tech Stack

- **Backend**: Java Spring Boot 3.2.0, PostgreSQL
- **Frontend**: React 18, Vite, TailwindCSS
- **Authentication**: JWT (JSON Web Tokens)
- **Database**: PostgreSQL

## Features

### Admin/Landlord Features
- Authentication & Authorization (JWT-based)
- Boarding House & Room Management (CRUD)
- Tenant Management
- Contract Management
- Service & Utility Management
- Invoice Generation & Management
- Payment Tracking
- Dashboard with Statistics

### Tenant Features
- Tenant Portal Login
- View Room & Contract Information
- View Invoices
- View Payment History

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- Node.js 18+ and npm
- PostgreSQL 12+

## Setup Instructions

### 1. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE boarding_house_db;
```

Update database credentials in `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/boarding_house_db
    username: your_username
    password: your_password
```

### 2. Backend Setup

```bash
cd backend
mvn clean install
mvn spring-boot:run
```

The backend will run on `http://localhost:8080`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173`

## Default Accounts

After running the application, the following accounts are seeded:

**Admin:**
- Username: `admin`
- Password: `admin123`

**Tenant:**
- Username: `tenant`
- Password: `tenant123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login

### Boarding Houses
- `GET /api/boarding-houses` - Get all boarding houses
- `GET /api/boarding-houses/{id}` - Get boarding house by ID
- `POST /api/boarding-houses` - Create boarding house
- `PUT /api/boarding-houses/{id}` - Update boarding house
- `DELETE /api/boarding-houses/{id}` - Delete boarding house

### Rooms
- `GET /api/rooms` - Get all rooms (optional: `?boardingHouseId={id}`)
- `GET /api/rooms/{id}` - Get room by ID
- `POST /api/rooms` - Create room
- `PUT /api/rooms/{id}` - Update room
- `DELETE /api/rooms/{id}` - Delete room

### Tenants
- `GET /api/tenants` - Get all tenants
- `GET /api/tenants/{id}` - Get tenant by ID
- `POST /api/tenants` - Create tenant
- `PUT /api/tenants/{id}` - Update tenant
- `DELETE /api/tenants/{id}` - Delete tenant

### Contracts
- `GET /api/contracts` - Get all contracts
- `GET /api/contracts/{id}` - Get contract by ID
- `POST /api/contracts` - Create contract
- `PUT /api/contracts/{id}` - Update contract
- `POST /api/contracts/{id}/terminate` - Terminate contract
- `DELETE /api/contracts/{id}` - Delete contract

### Invoices
- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/{id}` - Get invoice by ID
- `GET /api/invoices/contract/{contractId}` - Get invoices by contract
- `POST /api/invoices/generate` - Generate invoice

### Payments
- `GET /api/payments` - Get all payments
- `GET /api/payments/{id}` - Get payment by ID
- `GET /api/payments/invoice/{invoiceId}` - Get payments by invoice
- `POST /api/payments` - Create payment
- `DELETE /api/payments/{id}` - Delete payment

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

## Project Structure

```
boarding-house-management-system/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/boardinghouse/
│   │   │   │   ├── entity/          # JPA entities
│   │   │   │   ├── repository/     # Data repositories
│   │   │   │   ├── service/        # Business logic
│   │   │   │   ├── controller/     # REST controllers
│   │   │   │   ├── dto/            # Data transfer objects
│   │   │   │   ├── security/       # Security configuration
│   │   │   │   ├── exception/      # Exception handling
│   │   │   │   └── config/         # Configuration classes
│   │   │   └── resources/
│   │   │       └── application.yml # Application configuration
│   │   └── test/
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── layouts/         # Layout components
│   │   ├── context/         # React context
│   │   ├── services/        # API services
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Development Notes

- The backend uses JPA with automatic schema generation (`ddl-auto: update`)
- Seed data is automatically created on first run via `DataSeeder`
- JWT tokens expire after 24 hours
- CORS is configured to allow requests from `http://localhost:5173` and `http://localhost:3000`

## License

This project is for educational purposes.

