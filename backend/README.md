# Backend - Boarding House Management System

Spring Boot REST API for managing boarding houses.

## Requirements

- Java 17+
- Maven 3.6+
- PostgreSQL 12+

## Configuration

1. Create PostgreSQL database:
```sql
CREATE DATABASE boarding_house_db;
```

2. Update `src/main/resources/application.yml` with your database credentials:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/boarding_house_db
    username: postgres
    password: postgres
```

3. Update JWT secret in `application.yml`:
```yaml
jwt:
  secret: your-256-bit-secret-key-change-this-in-production
```

## Running the Application

```bash
mvn spring-boot:run
```

Or build and run:

```bash
mvn clean package
java -jar target/boarding-house-management-1.0.0.jar
```

The API will be available at `http://localhost:8080/api`

## Default Accounts

- Admin: `admin` / `admin123`
- Tenant: `tenant` / `tenant123`

## API Documentation

All endpoints require JWT authentication except `/api/auth/**`.

Base URL: `http://localhost:8080/api`

See main README.md for endpoint details.

