# iCAS-CMU Project Audit Report

## 1. React Performance Audit

### Findings
- **Route Splitting**: All routes in `src/App.tsx` are imported eagerly.
- **Memoization**: Missing `React.memo` in heavy views: `ClubChatView`, `ClubMembersView`, `ClubAssignmentsView`.
- **Context**: `WebSocketContext` and `ClubContext` values are recreated on every render.

### Recommendations
1. **Code Split**: Use `React.lazy` and `Suspense` for all major route components.
2. **Memoize Contexts**: Wrap context values in `useMemo`.
3. **Memoize Views**: Add `React.memo` to `ClubChatView`, `ClubMembersView`, etc.
4. **Virtualize Lists**: Consider virtualization for chat messages and member lists.

---

## 2. Security Audit

### Findings
- **Auth**:
  - Weak default JWT secret fallback.
  - No token revocation/blacklist mechanism.
  - Refresh secret derived from access secret.
- **CORS/Headers**:
  - Missing security headers (Helmet).
  - CORS allows no-origin requests (risk for some clients).
- **Chat Encryption**:
  - Default encryption key fallback.
  - Hardcoded salt in key derivation.

### Recommendations
1. **Remove Defaults**: Fail if `JWT_SECRET` or `CHAT_ENCRYPTION_KEY` are missing.
2. **Add Helmet**: Install and configure `helmet` middleware.
3. **Tighten CORS**: Restrict no-origin requests.
4. **Token Blacklist**: Implement for logout/revocation.

---

## 3. API Security Audit

### Findings
- **Auth**: All protected routes correctly use `authenticate` middleware.
- **RBAC**: Many routes (Club, Report, Document) check RBAC in *controllers* instead of middleware.
- **Validation**:
  - Missing centralized validation.
  - Controllers use raw `req.body` without rigorous validation.
- **Rate Limiting**:
  - Missing on Auth (`/login`, `/signup`), Club (`/join`, create), and Chat read endpoints.

### Recommendations
1. **RBAC Middleware**: Move role checks from controllers to route middleware (`requireAdmin`, etc.).
2. **Rate Limiting**: Add limits to Auth and sensitive write endpoints.
3. **Validation**: Create/use centralized validation schemas (Zod or express-validator).

---

## 4. DevOps Audit

### Findings
- **CI/CD**:
  - Basic test/build pipeline exists.
  - **Missing**: Linting, Security scanning (`npm audit`), Dependency checks.
- **Docker**:
  - Dev config is solid.
  - Prod config lacks health checks, non-root user.
- **Release**: No automated versioning or changelog.

### Recommendations
1. **CI Enhancements**: Add lint and `npm audit` steps.
2. **Prod Docker**: Create hardened `Dockerfile.prod` or `docker-compose.prod.yml`.
3. **Dependabot**: Enable for dependency updates.

---

## 5. Architecture Audit

### Findings
- **Boundaries**: Clean separation of features (frontend/backend).
- **Types**: Duplicated between frontend and backend (drift risk).
- **DB Access**: Controllers use `pool.execute` directly; no Service/Repository layer.
- **WebSocket**: Consistent patterns used.

### Recommendations
1. **Shared Types**: Extract common types to a shared package/folder.
2. **Service Layer**: Move DB logic from controllers to Service classes.
3. **Standardize Errors**: Use consistent `ApiError` and response shapes.
