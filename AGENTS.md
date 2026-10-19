# PROJECT CONTEXT: erp-frontend (var-www-erp-frontend)

## MCP Knowledge Graph (Cross-Repo Aware)
- **Primary Frontend MCP ID:** `var-www-erp-frontend` (2,759 nodes, 6,269 edges indexed in `codebase-memory-mcp`).
- **Companion Backend MCP ID:** `var-www-erp-backend` (Located at `/var/www/erp-backend`, 3,365 nodes, 12,880 edges indexed).
- **Tech Stack:** Vue 3 + Vite Frontend Application (ERP System - Purchasing, Warehouse, Inventory modules).

## Agent Workflow Rules for This Repo
1. Always pass `"project": "var-www-erp-frontend"` when querying `codebase-memory-mcp` (`search_graph`, `trace_path`, `get_architecture`) for frontend components and state.
2. **Backend API Lookup:** Whenever you need to check API routes, request validation rules, Controllers, or response structures, query `"project": "var-www-erp-backend"` directly via `codebase-memory-mcp` instead of guessing or asking the user.
3. Never read full files or run broad grep searches; query the graph first and read only targeted line ranges (`start_line` to `end_line`).
4. Output code modifications strictly using minimal diffs / `SEARCH-REPLACE` blocks.
