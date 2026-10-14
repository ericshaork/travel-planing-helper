-- Wanderly Phase 1.5.3 Administrative Geography service-role grants.
-- Backend import and smoke-check scripts need service-role access to
-- admin_regions. This does not expand anon/authenticated permissions.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.admin_regions
to service_role;
