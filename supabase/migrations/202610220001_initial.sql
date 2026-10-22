-- ArahBaik: direct donations; this database NEVER collects payment credentials or donations.
create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, anon;

create table public.admin_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_members enable row level security;
create policy admin_self_read on public.admin_members for select to authenticated using (user_id = (select auth.uid()));
grant select on public.admin_members to authenticated;
revoke insert, update, delete on public.admin_members from anon, authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.admin_members where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function app_private.require_user() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null or not exists(select 1 from auth.users where id = u and email_confirmed_at is not null) then
    raise exception 'Akun dengan email terverifikasi diperlukan.' using errcode = '42501';
  end if;
  return u;
end $$;
revoke all on function app_private.require_user() from public;
grant execute on function app_private.require_user() to authenticated;

create table public.organization_submissions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 3 and 120),
  category text not null check (category in ('Masjid','Panti','Komunitas')),
  city text not null check (char_length(city) between 2 and 80), address text not null check (char_length(address) between 8 and 400),
  summary text not null check (char_length(summary) between 20 and 220), story text not null check (char_length(story) between 50 and 6000),
  needs text[] not null check (cardinality(needs) between 1 and 8 and char_length(array_to_string(needs, ',')) <= 640),
  manager_name text not null check (char_length(manager_name) between 3 and 100),
  manager_email text not null check (char_length(manager_email) between 3 and 200 and position('@' in manager_email) > 1),
  manager_phone text not null check (char_length(manager_phone) between 8 and 30),
  recipient_name text not null check (char_length(recipient_name) between 3 and 120),
  photo_path text, qr_path text, consent boolean not null check (consent),
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected','archived')),
  review_notes text, reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (qr_path is null or qr_path ~ ('^' || owner_id::text || '/' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$')),
  check (photo_path is null or photo_path ~ ('^' || owner_id::text || '/' || id::text || '/[0-9a-f-]{36}\.(png|jpg|webp)$'))
);
create index submissions_owner on public.organization_submissions(owner_id);
create index submissions_status on public.organization_submissions(status, updated_at desc);
alter table public.organization_submissions enable row level security;
create policy submission_read on public.organization_submissions for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
grant select on public.organization_submissions to authenticated;
revoke insert, update, delete on public.organization_submissions from anon, authenticated;

-- Public snapshot is physically separate: no email, phone, owner ID or review notes can leak.
create table public.directory (
  id uuid primary key references public.organization_submissions(id) on delete cascade,
  name text not null, category text not null, city text not null, address text not null,
  summary text not null, story text not null, needs text[] not null, recipient_name text not null,
  photo_path text, qr_path text not null, verified_at timestamptz not null, published_at timestamptz not null default now()
);
create index directory_category_city on public.directory(category,city);
alter table public.directory enable row level security;
create policy directory_public_read on public.directory for select to anon, authenticated using (true);
grant select on public.directory to anon, authenticated;
revoke insert, update, delete on public.directory from anon, authenticated;

create table public.audit_events (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
  entity_id uuid not null, action text not null, detail text, created_at timestamptz not null default now()
);
alter table public.audit_events enable row level security;
create policy audit_admin_read on public.audit_events for select to authenticated using ((select public.is_admin()));
grant select on public.audit_events to authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;

create function public.save_submission(p_data jsonb, p_id uuid default null) returns public.organization_submissions
language plpgsql security definer set search_path = '' as $$
declare u uuid := app_private.require_user(); r public.organization_submissions; n uuid := coalesce(p_id, gen_random_uuid());
begin
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if p_id is not null then
    select * into r from public.organization_submissions where id = p_id for update;
    if not found or r.owner_id <> u then raise exception 'Pengajuan tidak ditemukan.' using errcode = '42501'; end if;
    if r.status not in ('draft','rejected') then raise exception 'Tarik pengajuan sebelum mengubahnya.' using errcode = '22023'; end if;
  elsif (select count(*) from public.organization_submissions where owner_id = u) >= 10 then
    raise exception 'Maksimal 10 pengajuan per akun.' using errcode = '22023';
  end if;
  insert into public.organization_submissions(id,owner_id,name,category,city,address,summary,story,needs,manager_name,manager_email,manager_phone,recipient_name,photo_path,qr_path,consent)
  values(n,u,trim(p_data->>'name'),p_data->>'category',trim(p_data->>'city'),trim(p_data->>'address'),trim(p_data->>'summary'),trim(p_data->>'story'),
    array(select jsonb_array_elements_text(p_data->'needs')),trim(p_data->>'manager_name'),trim(p_data->>'manager_email'),trim(p_data->>'manager_phone'),
    trim(p_data->>'recipient_name'),nullif(p_data->>'photo_path',''),nullif(p_data->>'qr_path',''),coalesce((p_data->>'consent')::boolean,false))
  on conflict(id) do update set name=excluded.name,category=excluded.category,city=excluded.city,address=excluded.address,summary=excluded.summary,
    story=excluded.story,needs=excluded.needs,manager_name=excluded.manager_name,manager_email=excluded.manager_email,manager_phone=excluded.manager_phone,
    recipient_name=excluded.recipient_name,photo_path=excluded.photo_path,qr_path=excluded.qr_path,consent=excluded.consent,status='draft',updated_at=now()
  returning * into r;
  return r;
end $$;

create function public.submit_organization(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := app_private.require_user(); r public.organization_submissions;
begin
  select * into r from public.organization_submissions where id = p_id for update;
  if not found or r.owner_id <> u then raise exception 'Pengajuan tidak ditemukan.' using errcode = '42501'; end if;
  if r.status not in ('draft','rejected') then raise exception 'Status pengajuan tidak dapat diajukan.' using errcode = '22023'; end if;
  if r.qr_path is null or r.photo_path is null or not exists(select 1 from storage.objects where bucket_id='organization-files' and name=r.qr_path)
    or not exists(select 1 from storage.objects where bucket_id='organization-files' and name=r.photo_path) then
    raise exception 'Unggah foto dan QRIS sebelum mengajukan.' using errcode = '22023';
  end if;
  update public.organization_submissions set status='pending',review_notes=null,reviewed_by=null,reviewed_at=null,updated_at=now() where id=p_id;
  insert into public.audit_events(actor_id,entity_id,action) values(u,p_id,'submitted');
end $$;

create function public.withdraw_organization(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := app_private.require_user(); r public.organization_submissions;
begin
  select * into r from public.organization_submissions where id=p_id for update;
  if not found or r.owner_id<>u then raise exception 'Pengajuan tidak ditemukan.' using errcode='42501'; end if;
  delete from public.directory where id=p_id;
  update public.organization_submissions set status='draft',reviewed_by=null,reviewed_at=null,updated_at=now() where id=p_id;
  insert into public.audit_events(actor_id,entity_id,action) values(u,p_id,'withdrawn');
end $$;

create function public.review_organization(p_id uuid, p_decision text, p_notes text, p_identity_checked boolean default false, p_qris_checked boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := app_private.require_user(); r public.organization_submissions;
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.' using errcode='42501'; end if;
  if p_decision is null or p_decision not in ('approve','reject','revoke') or p_notes is null or char_length(trim(p_notes)) not between 5 and 2000 then
    raise exception 'Keputusan atau catatan tidak valid.' using errcode='22023';
  end if;
  select * into r from public.organization_submissions where id=p_id for update;
  if not found then raise exception 'Pengajuan tidak ditemukan.' using errcode='22023'; end if;
  if (p_decision in ('approve','reject') and r.status<>'pending') or (p_decision='revoke' and r.status<>'approved') then
    raise exception 'Status pengajuan sudah berubah. Muat ulang.' using errcode='22023';
  end if;
  if p_decision='approve' then
    if not coalesce(p_identity_checked,false) or not coalesce(p_qris_checked,false) or r.qr_path is null or r.photo_path is null
      or not exists(select 1 from storage.objects where bucket_id='organization-files' and name=r.qr_path)
      or not exists(select 1 from storage.objects where bucket_id='organization-files' and name=r.photo_path) then
      raise exception 'Identitas, berkas, dan QRIS wajib diperiksa.' using errcode='22023';
    end if;
    insert into public.directory(id,name,category,city,address,summary,story,needs,recipient_name,photo_path,qr_path,verified_at)
    values(r.id,r.name,r.category,r.city,r.address,r.summary,r.story,r.needs,r.recipient_name,r.photo_path,r.qr_path,now());
  else delete from public.directory where id=p_id;
  end if;
  update public.organization_submissions set status=case when p_decision='approve' then 'approved' else 'rejected' end,
    review_notes=trim(p_notes),reviewed_by=u,reviewed_at=now(),updated_at=now() where id=p_id;
  insert into public.audit_events(actor_id,entity_id,action,detail) values(u,p_id,p_decision,trim(p_notes));
end $$;

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade, organization_id uuid not null references public.directory(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,organization_id)
);
alter table public.favorites enable row level security;
create policy favorites_own_read on public.favorites for select to authenticated using (user_id=(select auth.uid()));
create policy favorites_own_insert on public.favorites for insert to authenticated with check (user_id=(select auth.uid()));
create policy favorites_own_delete on public.favorites for delete to authenticated using (user_id=(select auth.uid()));
grant select,insert,delete on public.favorites to authenticated;

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(), entry_date date not null,
  kind text not null check(kind in ('income','expense')), category text not null check(char_length(category) between 3 and 80),
  description text not null check(char_length(description) between 10 and 300),
  amount bigint not null check(amount between 1 and 1000000000), reference text not null default '' check(char_length(reference)<=160),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
  voided_at timestamptz, void_reason text check(char_length(void_reason) between 5 and 300)
);
alter table public.ledger_entries enable row level security;
create policy ledger_admin_read on public.ledger_entries for select to authenticated using ((select public.is_admin()));
grant select on public.ledger_entries to authenticated;
revoke insert,update,delete on public.ledger_entries from anon, authenticated;
-- Intentionally definer view: exposes only these public accounting columns; never creator IDs.
create view public.ledger_public as select id,entry_date,kind,category,description,amount,reference,created_at,voided_at,void_reason from public.ledger_entries;
grant select on public.ledger_public to anon,authenticated;

create function public.record_ledger(p_data jsonb) returns public.ledger_entries language plpgsql security definer set search_path='' as $$
declare u uuid := app_private.require_user(); r public.ledger_entries;
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.' using errcode='42501'; end if;
  insert into public.ledger_entries(entry_date,kind,category,description,amount,reference,created_by)
  values((p_data->>'entry_date')::date,p_data->>'kind',trim(p_data->>'category'),trim(p_data->>'description'),(p_data->>'amount')::bigint,coalesce(p_data->>'reference',''),u) returning * into r;
  insert into public.audit_events(actor_id,entity_id,action) values(u,r.id,'ledger_created');
  return r;
end $$;
create function public.void_ledger(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid := app_private.require_user();
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.' using errcode='42501'; end if;
  if p_reason is null or char_length(trim(p_reason)) not between 5 and 300 then raise exception 'Alasan pembatalan wajib diisi.' using errcode='22023'; end if;
  update public.ledger_entries set voided_at=now(),void_reason=trim(p_reason) where id=p_id and voided_at is null;
  if not found then raise exception 'Transaksi tidak ditemukan atau sudah dibatalkan.' using errcode='22023'; end if;
  insert into public.audit_events(actor_id,entity_id,action,detail) values(u,p_id,'ledger_voided',trim(p_reason));
end $$;

create table public.reports (
  id uuid primary key default gen_random_uuid(), reporter_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organization_submissions(id) on delete cascade,
  reason text not null check(reason in ('qris','identity','information','other')), message text not null check(char_length(message) between 20 and 2000),
  resolved_at timestamptz, resolution text, created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy reports_read on public.reports for select to authenticated using (reporter_id=(select auth.uid()) or (select public.is_admin()));
grant select on public.reports to authenticated;
revoke insert,update,delete on public.reports from anon, authenticated;
create function public.create_report(p_organization_id uuid,p_reason text,p_message text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid := app_private.require_user();
begin
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if not exists(select 1 from public.directory where id=p_organization_id) then raise exception 'Profil tidak ditemukan.' using errcode='22023'; end if;
  if (select count(*) from public.reports where reporter_id=u and created_at>now()-interval '1 day')>=5 then raise exception 'Maksimal 5 laporan per hari.' using errcode='22023'; end if;
  insert into public.reports(reporter_id,organization_id,reason,message) values(u,p_organization_id,p_reason,trim(p_message));
end $$;
create function public.resolve_report(p_id uuid,p_resolution text) returns void language plpgsql security definer set search_path='' as $$
declare u uuid := app_private.require_user();
begin
  if not public.is_admin() then raise exception 'Akses admin diperlukan.' using errcode='42501'; end if;
  if p_resolution is null or char_length(trim(p_resolution)) not between 5 and 1000 then raise exception 'Catatan penyelesaian wajib diisi.' using errcode='22023'; end if;
  update public.reports set resolved_at=now(),resolution=trim(p_resolution) where id=p_id and resolved_at is null;
  if not found then raise exception 'Laporan tidak ditemukan atau sudah selesai.' using errcode='22023'; end if;
  insert into public.audit_events(actor_id,entity_id,action,detail) values(u,p_id,'report_resolved',trim(p_resolution));
end $$;

-- Storage: private by default. Only a published snapshot exposes its exact immutable assets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('organization-files','organization-files',false,5242880,array['image/jpeg','image/png','image/webp']);
create policy org_file_read on storage.objects for select to anon,authenticated using (
  bucket_id='organization-files' and (
    exists(select 1 from public.directory d where d.photo_path=storage.objects.name or d.qr_path=storage.objects.name)
    or (select public.is_admin())
    or (select auth.uid())::text=split_part(name,'/',1)
  )
);
create policy org_file_insert on storage.objects for insert to authenticated with check (
  bucket_id='organization-files' and (select app_private.require_user())::text=split_part(name,'/',1)
  and exists(select 1 from public.organization_submissions s where s.id::text=split_part(storage.objects.name,'/',2) and s.owner_id=(select auth.uid()) and s.status in ('draft','rejected'))
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'
);
-- No update/delete policy: owners cannot swap an approved QRIS behind the verifier.

revoke all on function public.save_submission(jsonb,uuid),public.submit_organization(uuid),public.withdraw_organization(uuid),
  public.review_organization(uuid,text,text,boolean,boolean),public.record_ledger(jsonb),public.void_ledger(uuid,text),
  public.create_report(uuid,text,text),public.resolve_report(uuid,text) from public;
grant execute on function public.save_submission(jsonb,uuid),public.submit_organization(uuid),public.withdraw_organization(uuid),
  public.review_organization(uuid,text,text,boolean,boolean),public.record_ledger(jsonb),public.void_ledger(uuid,text),
  public.create_report(uuid,text,text),public.resolve_report(uuid,text) to authenticated;

create function public.directory_stats() returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('total',count(*),'cities',coalesce(jsonb_agg(distinct city),'[]'::jsonb),
    'masjid',count(*) filter(where category='Masjid'),'panti',count(*) filter(where category='Panti'),
    'komunitas',count(*) filter(where category='Komunitas')) from public.directory;
$$;
create function public.ledger_totals() returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('income',coalesce(sum(amount) filter(where kind='income' and voided_at is null),0),
    'expense',coalesce(sum(amount) filter(where kind='expense' and voided_at is null),0)) from public.ledger_public;
$$;
revoke all on function public.directory_stats(),public.ledger_totals() from public;
grant execute on function public.directory_stats(),public.ledger_totals() to anon,authenticated;
