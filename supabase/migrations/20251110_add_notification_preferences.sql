-- Notification preferences per company
-- Stores toggles for operational alerts that we can manage locally

create table notification_preferences (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid not null references companies(id) on delete cascade,
    load_updates boolean not null default true,
    invoice_events boolean not null default true,
    maintenance_alerts boolean not null default true,
    escalation_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index notification_preferences_company_idx
    on notification_preferences(company_id);

alter table notification_preferences enable row level security;

create policy "Company members can view notification preferences" on notification_preferences
    for select using (
        company_id in (
            select company_id from profiles where id = auth.uid()
        )
    );

create policy "Authorized roles can manage notification preferences" on notification_preferences
    for insert using (
        company_id in (
            select company_id from profiles
            where id = auth.uid() and role in ('company_admin', 'manager')
        )
    ) with check (
        company_id in (
            select company_id from profiles
            where id = auth.uid() and role in ('company_admin', 'manager')
        )
    );

create policy "Authorized roles can update notification preferences" on notification_preferences
    for update using (
        company_id in (
            select company_id from profiles
            where id = auth.uid() and role in ('company_admin', 'manager')
        )
    ) with check (
        company_id in (
            select company_id from profiles
            where id = auth.uid() and role in ('company_admin', 'manager')
        )
    );

create trigger set_notification_preferences_updated_at
    before update on notification_preferences
    for each row
    execute function update_updated_at_column();
