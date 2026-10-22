import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("migration, RLS, publication, immutable QRIS, and accounting lifecycle", async (t) => {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,storage to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
  `);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610220001_initial.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const owner = "00000000-0000-4000-8000-000000000001",
    stranger = "00000000-0000-4000-8000-000000000002",
    admin = "00000000-0000-4000-8000-000000000003",
    unverified = "00000000-0000-4000-8000-000000000004";
  await db.exec(
    `insert into auth.users values('${owner}',now()),('${stranger}',now()),('${admin}',now()),('${unverified}',null); insert into public.admin_members(user_id) values('${admin}');`,
  );
  const as = async (role: string, user = "") => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      user,
    ]);
    await db.exec(`set role ${role}`);
  };
  const count = async (table: string) =>
    Number(
      (await db.query<{ n: number }>(`select count(*)::int as n from ${table}`))
        .rows[0].n,
    );
  const input = {
    name: "Lembaga Pengujian",
    category: "Masjid",
    city: "Depok",
    address: "Jalan Pengujian nomor 123",
    summary: "Ringkasan profil untuk pengujian database.",
    story:
      "Ini adalah cerita lembaga untuk menguji alur pengajuan, pemeriksaan, dan penerbitan secara utuh.",
    needs: ["Pendidikan"],
    manager_name: "Pengelola Uji",
    manager_email: "test@example.com",
    manager_phone: "081234567890",
    recipient_name: "LEMBAGA PENGUJIAN",
    photo_path: null as string | null,
    qr_path: null as string | null,
    consent: true,
  };
  let org = "";
  let photo = "";
  let qr = "";
  await t.test("unverified users cannot create submissions", async () => {
    await as("authenticated", unverified);
    await assert.rejects(
      db.query("select public.save_submission($1::jsonb)", [
        JSON.stringify(input),
      ]),
      /terverifikasi/,
    );
  });
  await t.test(
    "owner creates draft; private contact is not public",
    async () => {
      await as("authenticated", owner);
      const r = await db.query<{ id: string }>(
        "select (public.save_submission($1::jsonb)).id",
        [JSON.stringify(input)],
      );
      org = r.rows[0].id;
      assert.equal(await count("public.organization_submissions"), 1);
      await as("anon");
      assert.equal(await count("public.directory"), 0);
      await assert.rejects(
        db.query("select manager_email from public.organization_submissions"),
        /permission denied/,
      );
      await as("authenticated", stranger);
      assert.equal(await count("public.organization_submissions"), 0);
      await assert.rejects(
        db.query("select public.save_submission($1::jsonb,$2::uuid)", [
          JSON.stringify(input),
          org,
        ]),
        /tidak ditemukan/,
      );
    },
  );
  await t.test(
    "users cannot promote themselves or bypass publication RPCs",
    async () => {
      await as("authenticated", owner);
      await assert.rejects(
        db.query(`insert into public.admin_members(user_id) values($1)`, [
          owner,
        ]),
        /permission denied/,
      );
      await assert.rejects(
        db.query(
          `update public.organization_submissions set status='approved' where id=$1`,
          [org],
        ),
        /permission denied/,
      );
      await assert.rejects(
        db.query(`insert into public.directory(id) values($1)`, [org]),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select public.submit_organization($1)", [org]),
        /Unggah foto/,
      );
    },
  );
  await t.test(
    "storage ownership is enforced and submission requires real stored files",
    async () => {
      photo = `${owner}/${org}/00000000-0000-4000-8000-000000000010.jpg`;
      qr = `${owner}/${org}/00000000-0000-4000-8000-000000000011.png`;
      await as("authenticated", stranger);
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('organization-files',$1)",
          [photo],
        ),
        /row-level security/,
      );
      await as("authenticated", owner);
      await db.query(
        "insert into storage.objects(bucket_id,name) values('organization-files',$1),('organization-files',$2)",
        [photo, qr],
      );
      input.photo_path = photo;
      input.qr_path = qr;
      await db.query("select public.save_submission($1::jsonb,$2)", [
        JSON.stringify(input),
        org,
      ]);
      await db.query("select public.submit_organization($1)", [org]);
      await assert.rejects(
        db.query("select public.save_submission($1::jsonb,$2)", [
          JSON.stringify(input),
          org,
        ]),
        /Tarik pengajuan/,
      );
      await as("anon");
      assert.equal(await count("storage.objects"), 0);
    },
  );
  await t.test(
    "only admin can approve, with both verifications; snapshot has no private data",
    async () => {
      await as("authenticated", owner);
      await assert.rejects(
        db.query(
          "select public.review_organization($1,'approve','Diperiksa dengan bukti',true,true)",
          [org],
        ),
        /admin/,
      );
      await as("authenticated", admin);
      await assert.rejects(
        db.query(
          "select public.review_organization($1,'approve','Bukti diperiksa',false,true)",
          [org],
        ),
        /wajib diperiksa/,
      );
      await db.query(
        "select public.review_organization($1,'approve','Identitas dan nama penerima telah diperiksa',true,true)",
        [org],
      );
      await as("anon");
      const r = await db.query<Record<string, unknown>>(
        "select * from public.directory",
      );
      assert.equal(r.rows.length, 1);
      assert.ok(!("manager_email" in r.rows[0]));
      assert.ok(!("owner_id" in r.rows[0]));
      assert.equal(await count("storage.objects"), 2);
      await assert.rejects(
        db.query("select public.submit_organization($1)", [org]),
        /permission denied/,
      );
    },
  );
  await t.test(
    "approved assets cannot be replaced/deleted or overwritten by owner",
    async () => {
      await as("authenticated", owner);
      assert.equal(
        (
          await db.query(
            "update storage.objects set name='changed' where name=$1 returning name",
            [qr],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query(
            "delete from storage.objects where name=$1 returning name",
            [qr],
          )
        ).rows.length,
        0,
      );
      await assert.rejects(
        db.query(
          "insert into storage.objects(bucket_id,name) values('organization-files',$1)",
          [`${owner}/${org}/00000000-0000-4000-8000-000000000012.png`],
        ),
        /row-level security/,
      );
      await assert.rejects(
        db.query("select public.save_submission($1::jsonb,$2)", [
          JSON.stringify(input),
          org,
        ]),
        /Tarik pengajuan/,
      );
    },
  );
  await t.test(
    "favorites are private; public reports persist and admin resolves them",
    async () => {
      await as("authenticated", owner);
      await db.query(
        "insert into public.favorites(user_id,organization_id) values($1,$2)",
        [owner, org],
      );
      await db.query(
        "select public.create_report($1,'information','Alamat pada profil perlu dikonfirmasi ulang oleh pengelola.')",
        [org],
      );
      await as("authenticated", stranger);
      assert.equal(await count("public.favorites"), 0);
      assert.equal(await count("public.reports"), 0);
      await as("authenticated", admin);
      const report = (
        await db.query<{ id: string }>("select id from public.reports")
      ).rows[0];
      await db.query(
        "select public.resolve_report($1,'Sudah dikonfirmasi dengan pengelola.')",
        [report.id],
      );
    },
  );
  await t.test(
    "withdrawal immediately hides snapshot/assets and requires a new review",
    async () => {
      await as("authenticated", owner);
      await db.query("select public.withdraw_organization($1)", [org]);
      assert.equal(await count("public.favorites"), 0);
      await as("anon");
      assert.equal(await count("public.directory"), 0);
      assert.equal(await count("storage.objects"), 0);
      await as("authenticated", owner);
      await db.query("select public.submit_organization($1)", [org]);
      await as("authenticated", admin);
      await db.query(
        "select public.review_organization($1,'reject','Mohon perbarui alamat lembaga.',false,false)",
        [org],
      );
      await as("authenticated", owner);
      await db.query("select public.save_submission($1::jsonb,$2)", [
        JSON.stringify(input),
        org,
      ]);
    },
  );
  await t.test(
    "ledger is admin-only to write; cancellation retains public audit trail and correct totals",
    async () => {
      const entry = {
        entry_date: "2026-10-22",
        kind: "income",
        category: "Kerja sama",
        description: "Pemasukan operasional pengujian",
        amount: 500000,
        reference: "TEST-001",
      };
      await as("authenticated", owner);
      await assert.rejects(
        db.query("select public.record_ledger($1)", [JSON.stringify(entry)]),
        /admin/,
      );
      await as("authenticated", admin);
      const v = await db.query<{ id: string }>(
        "select (public.record_ledger($1)).id",
        [JSON.stringify(entry)],
      );
      const key = v.rows[0].id;
      await db.query("select public.record_ledger($1)", [
        JSON.stringify({
          ...entry,
          kind: "expense",
          amount: 100000,
          category: "Hosting",
        }),
      ]);
      await as("anon");
      let totals = (
        await db.query<{ ledger_totals: { income: number; expense: number } }>(
          "select public.ledger_totals()",
        )
      ).rows[0].ledger_totals;
      assert.deepEqual(totals, { income: 500000, expense: 100000 });
      await assert.rejects(
        db.query("select created_by from public.ledger_public"),
        /does not exist/,
      );
      await as("authenticated", admin);
      await db.query(
        "select public.void_ledger($1,'Koreksi nominal pemasukan pengujian')",
        [key],
      );
      await as("anon");
      assert.equal(await count("public.ledger_public"), 2);
      totals = (
        await db.query<{ ledger_totals: { income: number; expense: number } }>(
          "select public.ledger_totals()",
        )
      ).rows[0].ledger_totals;
      assert.deepEqual(totals, { income: 0, expense: 100000 });
      await as("authenticated", admin);
      assert.ok((await count("public.audit_events")) >= 7);
    },
  );
  await db.close();
});
