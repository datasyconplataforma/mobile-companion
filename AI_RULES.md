# AI Rules and Guidelines

This document outlines the core technologies, libraries, and architectural rules used in this application. AI assistants should strictly adhere to these guidelines when suggesting or implementing changes.

## Tech Stack

- **React 18**: The core frontend library.
- **TypeScript**: Used for all source code to ensure type safety.
- **Vite**: The build tool and development server.
- **Tailwind CSS**: Used for all styling, layout, and visual design.
- **shadcn/ui & Radix UI**: The foundation for all accessible UI components.
- **React Router DOM**: For client-side routing and navigation.
- **React Query**: For asynchronous state management, data fetching, and caching.
- **Supabase**: Used as the backend-as-a-service for authentication and database interactions.
- **React Hook Form & Zod**: For building robust forms with schema-based validation.
- **Lucide React**: For consistent, scalable, and customizable iconography.

## Library Usage Rules

### 1. UI Components and Styling
- **shadcn/ui**: ALWAYS use prebuilt components from `shadcn/ui` instead of building from scratch. Import them from `@/components/ui/`. If a component is already generated, use it directly without modification.
- **Tailwind CSS**: Use Tailwind utility classes extensively. Do NOT create custom CSS, CSS modules, or SCSS files unless absolutely unavoidable.
- **Lucide React**: Exclusively use `lucide-react` for icons. Do not install or use other icon libraries.
- **Theming**: Use `next-themes` to manage light and dark modes. Ensure all styling respects both themes utilizing Tailwind's `dark:` variant.

### 2. State Management and Data Fetching
- **React Query**: Use `@tanstack/react-query` for all server state, data fetching, caching, and mutations. Avoid using `useEffect` combined with `useState` for API calls.
- **Local State**: Use standard React hooks (`useState`, `useReducer`) for purely UI-related local state (e.g., toggling a modal).

### 3. Forms and Validation
- **React Hook Form**: Always use `react-hook-form` to manage form state, track interactions, and handle submissions.
- **Zod**: Use `zod` for defining data schemas and form validation rules. Integrate it with `react-hook-form` using `@hookform/resolvers/zod`.
- **shadcn/ui Form Component**: Combine the above using the unified `<Form>` component structure provided by `shadcn/ui`.

### 4. Routing
- **React Router**: Keep all route definitions centralized in `src/App.tsx`. New pages must be registered there to be accessible.
- **Navigation**: Use React Router's `<Link>` component or `useNavigate()` hook for all internal navigation to ensure a smooth, SPA experience without page reloads.

### 5. Backend Interactions
- **Supabase**: Use `@supabase/supabase-js` for all backend interactions, including auth, database queries, and storage.
- **Integration**: Perform Supabase data fetching inside React Query hooks (`useQuery`, `useMutation`) to automatically handle loading states, errors, and caching.

### 6. Specialized Libraries
- **Charts**: Use `recharts` for building charts and data visualizations.
- **Markdown**: Use `react-markdown` along with `react-syntax-highlighter` when rendering markdown content.
- **Notifications/Toasts**: Use `sonner` or the pre-installed `shadcn/ui` toast component for global user notifications and alerts.

## General Project Architecture

- **`src/pages/`**: Contains top-level route components representing full views. `src/pages/Index.tsx` is the default landing page.
- **`src/components/`**: Contains reusable, domain-specific components.
- **`src/components/ui/`**: Contains purely presentational `shadcn/ui` components. Do not put business logic here.
- **Simplicity**: Focus on writing small, focused files. Avoid over-engineering, premature abstractions, or adding unnecessary configurability.
