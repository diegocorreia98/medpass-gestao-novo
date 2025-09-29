# Project Overview

This is a web application for MedPass Gestão, a management platform. It is built with a modern frontend stack and leverages Supabase for backend services.

**Main Technologies:**

*   **Frontend:**
    *   Vite
    *   React
    *   TypeScript
    *   Tailwind CSS
    *   shadcn-ui
*   **Backend:**
    *   Supabase (Authentication, Database, Serverless Functions)

**Architecture:**

The application is a single-page application (SPA) with a clear separation of concerns. The frontend is built with React and uses `react-router-dom` for navigation. It has a role-based access control system with two user types: `matriz` and `unidade`. The backend is powered by Supabase, which provides authentication, a PostgreSQL database, and serverless functions.

# Building and Running

**Prerequisites:**

*   Node.js and npm (or bun)

**Development:**

To run the application in development mode, use the following command:

```sh
npm run dev
```

This will start the Vite development server on `http://localhost:8080`.

**Building:**

To build the application for production, use the following command:

```sh
npm run build
```

This will create a `dist` directory with the optimized production build.

**Linting:**

To lint the codebase, use the following command:

```sh
npm run lint
```

# Development Conventions

*   **Path Aliases:** The project uses the `@` alias for the `src` directory.
*   **Styling:** The project uses Tailwind CSS for styling and shadcn-ui for UI components.
*   **State Management:** The project uses React Context and `@tanstack/react-query` for state management.
*   **Routing:** The project uses `react-router-dom` for routing.
*   **Backend:** The project uses Supabase for backend services. The Supabase project configuration is located in the `supabase` directory.
