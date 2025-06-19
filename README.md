# Hooks Architecture README

## Hook Patterns

### useCrud Pattern
For CRUD operations on database entities with `id` property:
- `useFincas`, `useBloques` - use `useGenericCrud`
- Provides: `items`, `getStateInfo`, `create`, `update`, `remove`
- Uses `StateDisplay` component for loading/error/empty states

### Custom Hook Pattern  
For specialized data fetching (non-CRUD):
- `useAcciones` - fetches column names (returns string[])
- **Different from CRUD hooks because**: returns primitive strings, not objects with IDs
- Implements own `getStateInfo` for consistency with CRUD hooks
- Uses `StateDisplay` component for UI consistency

## Acciones Hook Specifics
- Fetches table column metadata, not database records
- Returns `string[]` instead of `Entity[]`
- Cannot use `useGenericCrud` due to type constraints (no `id` property)
- Maintains same UI patterns (`getStateInfo` + `StateDisplay`) for consistency

## Future Regularization
- Consider creating `useQuery` hook for non-CRUD data fetching
- Standardize all hooks to use `getStateInfo` + `StateDisplay` pattern
- Keep CRUD operations using `useGenericCrud`
