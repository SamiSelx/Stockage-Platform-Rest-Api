# Stockage Platform REST API

## Project Overview

A secure REST API backend for the **Stockage File Platform**, a Zero-Knowledge encrypted cloud storage system. The server handles user management, file/folder operations, and cryptographic key orchestration while **never accessing plaintext files or encryption keys**.

---

## Architecture

The project follows a modular architecture organized inside the `src` folder:

```
src/
├── config/         # Environment variables and database configuration
├── controller/     # Request handlers and response logic
├── db/             # Database connections, models, and queries
├── middleware/     # Auth, error handling, and validation interceptors
├── routes/         # API route definitions mapped to controllers
├── services/       # Business logic layer (separated from controllers)
├── test/           # Unit and integration tests
├── types/          # TypeScript type definitions
└── utils/          # Shared utility functions
```

---

## API Routes

The application exposes the following route namespaces:

```
/auth       → Authentication (register, login, password change, recovery)
/file       → File management (upload, download, share, delete, move)
/folder     → Folder management (create, delete, move, list)
/user       → User profile and quota management
```


---

## Packages Used

| Package | Version | Purpose |
|---------|---------|---------|
| [Express](https://expressjs.com/) | 4.18.2 | Web framework for Node.js |
| [Mongoose](https://mongoosejs.com/) | 7.4.0 | MongoDB object modeling |
| [Jest](https://jestjs.io/) | 29.7.0 | Testing framework |
| [Supertest](https://github.com/visionmedia/supertest) | 6.3.3 | HTTP endpoint testing |
| [jsonwebtoken](https://jwt.io/) | 9.0.1 | JWT-based session authentication |
| [Winston](https://github.com/winstonjs/winston) | 3.11.0 | Application logging |
| [cors](https://www.npmjs.com/package/cors) | 2.8.5 | Cross-Origin Resource Sharing |
| [express-validator](https://express-validator.github.io/docs/) | 7.0.1 | Request data validation |

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Transpile TypeScript to JavaScript |
| `npm run dev` | Start development server with live reloading |
| `npm run start` | Start the production server |
| `npm run test` | Run Jest tests (no cache) |
| `npm run seed` | Seed the database with initial data |
| `npm run doc` | Generate TypeDoc documentation |
| `npm run lint` | Lint TypeScript files |
| `npm run lint:fix` | Auto-fix linting errors |

---

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/SamiSelx/Stockage-Platform-Rest-Api
   cd Stockage-Platform-Rest-Api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy `.env.example` and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Required variables include the MongoDB connection string and JWT secret.

4. **Start the server**
   ```bash
   npm run dev    # development
   npm start      # production
   ```

---

## Security Model

This API is designed around a **Zero-Knowledge architecture**:

- Files are **encrypted client-side** before upload, the server never sees plaintext data
- Encryption keys never reach the server in clear form
- Password changes re-encrypt the RMK only, **without touching file keys**
- File sharing uses **RSA-OAEP hybrid encryption** so the server never sees raw file keys
- Identity verification before sharing uses a **challenge-response protocol** with MiniCertificates
- Passwords are hashed with **bcrypt**; sessions are managed via **JWT**

> See the [cryptographic architecture documentation](https://github.com/SamiSelx/Stockage-Platform/blob/main/README.md) for a full breakdown of the key hierarchy (KEK → RMK → FK).

