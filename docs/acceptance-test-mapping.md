# Acceptance Criteria to Tests Mapping

## Functional Acceptance

1. Fee profile math (rounding/min fee/day trade)
- Unit: `libs/domain/test/fee.test.ts`
- Integration: `apps/api/test/integration.test.ts`

2. FIFO/LIFO lot matching
- Unit: `libs/domain/test/lot.test.ts`

3. Historical immutability + recompute preview/confirm
- Integration: `apps/api/test/integration.test.ts`
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

4. Critical user journey
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

5. Service health and readiness
- API endpoints: `/health/live`, `/health/ready`

6. Web locale switch and full Traditional Chinese translation
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

7. Settings unsaved-change discard flow
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

8. Settings/domain tooltips visibility and accessibility (including FIFO/LIFO details)
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

9. Fee profile settings UX v2 (drawer tabs, account fallback, per-security overrides)
- Integration: `apps/api/test/integration.test.ts`
- E2E: `tests/e2e/specs/critical-flows.spec.ts`

10. System-generated profile IDs and temp-ID resolution in full settings save flow
- Integration: `apps/api/test/integration.test.ts`

11. Security baseline (strict validation + tenant-safe persistence upserts)
- Integration: `apps/api/test/integration.test.ts`
