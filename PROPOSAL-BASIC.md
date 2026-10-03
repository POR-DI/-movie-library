# Final Project Proposal — CineShelf

กลุ่ม: [ชื่อกลุ่ม] · สมาชิก: พอ เดียวตระกูล 682110182, เติ้ล [ชื่อจริง–รหัสนักศึกษา], อั๋น [ชื่อจริง–รหัสนักศึกษา]

## 1. แอปนี้ทำอะไร ใครใช้

CineShelf เป็นเว็บไซต์เก็บรายชื่อหนังที่ชอบและหนังที่อยากดู สำหรับคนที่ชอบดูหนังแต่จำชื่อหนังหรือรายการที่อยากดูไม่ได้ ผู้ใช้สามารถค้นหาหนัง ดูรายละเอียด กดถูกใจหรือเก็บไว้ดูทีหลัง และแชร์ลิงก์โปรไฟล์ให้เพื่อนเห็นหนังที่ตนกดถูกใจ คล้ายการแชร์โปรไฟล์ใน Spotify โดยเจ้าของเลือกได้ว่าจะให้โปรไฟล์เป็นสาธารณะหรือส่วนตัว

## 2. หน้าที่จะมี (อย่างน้อย 4 route)

| Route | หน้านี้ทำอะไร |
| ----- | ------------- |
| `/` | หน้าแรก แสดงหนังยอดนิยมและช่องค้นหา |
| `/movies` | รายการหนัง ค้นหาและกรองประเภท โดยเก็บคำค้นใน URL |
| `/movies/:id` | รายละเอียดหนัง เช่น โปสเตอร์ เรื่องย่อ คะแนน พร้อมปุ่มถูกใจและปุ่มอยากดู |
| `/register` | ฟอร์มสมัครสมาชิก |
| `/login` | ฟอร์มเข้าสู่ระบบ |
| `/library` | ห้องสมุดของฉัน แยกแท็บ “ถูกใจ” และ “อยากดู” |
| `/settings/profile` | แก้ชื่อผู้ใช้ ชื่อที่แสดง รูปโปรไฟล์ เลือกสาธารณะ/ส่วนตัว และคัดลอกลิงก์โปรไฟล์ |
| `/u/:username` | โปรไฟล์ที่แชร์ให้เพื่อนดู แสดงหนังที่เจ้าของกดถูกใจ แบบอ่านอย่างเดียว |

## 3. Server หรือ Client — และทำไม

| ส่วนของแอป | Server / Client | เหตุผล |
| ---------- | --------------- | ------ |
| ดึงข้อมูลหนังจาก TMDB | Server (Node.js) | เก็บ TMDB API Key ไว้ที่เซิร์ฟเวอร์ ไม่ส่งไปเบราว์เซอร์ |
| แสดงรายการและรายละเอียดหนัง | Client | รับข้อมูลจากเซิร์ฟเวอร์มาแสดงด้วย React |
| ช่องค้นหาและตัวกรอง | Client | ต้องรับค่าที่ผู้ใช้พิมพ์และเปลี่ยน URL |
| ฟอร์มสมัครสมาชิกและเข้าสู่ระบบ | Client | ใช้ react-hook-form + zod ตรวจข้อมูลก่อนส่งให้ Supabase Auth |
| สมัคร/ล็อกอิน/session | Server (Supabase Auth) | Supabase จัดการแฮชรหัสผ่านและ session ให้ ไม่ต้องเขียนเอง |
| อ่าน–เขียนห้องสมุดและโปรไฟล์ | Client → Supabase | เรียกด้วย Supabase JS + anon key ได้ เพราะสิทธิ์ถูกบังคับด้วย Row Level Security (RLS) ที่ฐานข้อมูล |
| ปุ่มถูกใจ/อยากดู และสวิตช์สาธารณะ | Client | ต้องตอบสนองทันทีเมื่อกด (optimistic update) แล้วค่อยบันทึกลง Supabase |

> anon key ของ Supabase เปิดเผยในเบราว์เซอร์ได้ตามการออกแบบ ความปลอดภัยมาจาก RLS ส่วน `service_role` key ห้ามอยู่ฝั่ง client เด็ดขาด

## 4. ข้อมูลมาจากไหน + จุดที่ต้องเขียนข้อมูลกลับ

- **แหล่งข้อมูล:** TMDB API สำหรับข้อมูลหนัง และ **Supabase (PostgreSQL + Auth)** สำหรับบัญชีผู้ใช้ โปรไฟล์ และรายการหนังที่บันทึก
- **mutation (ผ่าน Supabase JS ภายใต้ RLS):**
  - สมัครสมาชิก: Supabase Auth สร้างบัญชี แล้ว trigger สร้างแถวใน `profiles` อัตโนมัติ
  - เข้าสู่ระบบ/ออกจากระบบ: สร้างหรือลบ session ของ Supabase Auth
  - ถูกใจ/เลิกถูกใจ, เพิ่ม/ลบจากอยากดู: insert/delete ใน `library_items`
  - แก้โปรไฟล์และเปลี่ยนสาธารณะ/ส่วนตัว: update `profiles` (RLS ให้แก้ได้เฉพาะแถวของตัวเอง)

### การแชร์โปรไฟล์ (แบบ Spotify)

- ทุกบัญชีมีลิงก์ประจำตัว `/u/:username` คัดลอกได้จากหน้าตั้งค่า
- **สาธารณะ:** ใครมีลิงก์ก็เปิดดูหนังที่เจ้าของกดถูกใจได้ ไม่ต้องล็อกอิน
- **ส่วนตัว (ค่าเริ่มต้น):** เจ้าของเท่านั้นที่เห็น คนอื่นเปิดลิงก์จะเจอหน้า “โปรไฟล์นี้เป็นส่วนตัว”
- เพื่อนเห็นเฉพาะรายการ **ถูกใจ** ไม่เห็นรายการอยากดูและไม่เห็นอีเมล
- เปลี่ยนจากสาธารณะเป็นส่วนตัวแล้วมีผลทันที เพราะ RLS ตรวจทุกครั้งที่อ่าน

### Supabase Schema

```sql
-- โปรไฟล์ผูก 1:1 กับ auth.users (อีเมลอยู่ใน auth.users ไม่ซ้ำเก็บที่นี่)
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique
               check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url   text,
  is_public    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- รายการหนังของผู้ใช้: kind แยก "ถูกใจ" กับ "อยากดู" ในตารางเดียว
-- เก็บ title/poster_path ไว้ด้วย เพื่อให้หน้าโปรไฟล์แสดงได้โดยไม่ต้องยิง TMDB ทีละเรื่อง
create table public.library_items (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tmdb_movie_id integer not null,
  kind          text not null check (kind in ('liked', 'watchlist')),
  title         text not null,
  poster_path   text,
  created_at    timestamptz not null default now(),
  unique (user_id, tmdb_movie_id, kind)   -- กดซ้ำไม่เกิดรายการซ้ำ
);

create index library_items_user_kind_idx
  on public.library_items (user_id, kind, created_at desc);

-- สร้างโปรไฟล์อัตโนมัติเมื่อสมัคร (username/display_name ส่งมาใน options.data ตอน signUp)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'username')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles      enable row level security;
alter table public.library_items enable row level security;

-- profiles: ใครก็อ่านโปรไฟล์สาธารณะได้, เจ้าของอ่าน/แก้ของตัวเองได้
create policy "read public or own profile" on public.profiles
  for select using (is_public or id = auth.uid());

create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- library_items: เจ้าของเห็นทุกอย่าง, คนอื่นเห็นเฉพาะ liked ของโปรไฟล์สาธารณะ
create policy "read own or public liked" on public.library_items
  for select using (
    user_id = auth.uid()
    or (
      kind = 'liked'
      and exists (
        select 1 from public.profiles p
        where p.id = library_items.user_id and p.is_public
      )
    )
  );

create policy "insert own items" on public.library_items
  for insert with check (user_id = auth.uid());

create policy "delete own items" on public.library_items
  for delete using (user_id = auth.uid());
```

## 5. Global State (User State)

ใช้ **React Context** 2 ตัว ครอบทั้งแอปที่ `main.jsx` ไม่ใช้ Redux/Zustand เพราะ state ที่ต้องแชร์ทั้งแอปมีไม่มาก

| Context | เก็บอะไร | ใครใช้ |
| ------- | -------- | ------ |
| `AuthContext` | `session`, `user`, `profile` (username, display_name, is_public), `loading`, ฟังก์ชัน `signUp / signIn / signOut / updateProfile` | Navbar, หน้า login/register, หน้าตั้งค่า, route guard ของ `/library` และ `/settings/profile` |
| `LibraryContext` | `likedIds` และ `watchlistIds` (Set ของ TMDB id), ฟังก์ชัน `toggleLiked / toggleWatchlist` | ปุ่มบนการ์ดหนังทุกใบ หน้ารายละเอียด หน้าห้องสมุด |

- `AuthContext` ฟัง `supabase.auth.onAuthStateChange` เพื่ออัปเดต user เมื่อล็อกอิน/ล็อกเอาต์ หรือ session หมดอายุ และโหลด `profile` ของผู้ใช้หลังล็อกอิน
- `LibraryContext` โหลดรายการของผู้ใช้ครั้งเดียวหลังล็อกอิน ทุกการ์ดหนังจึงรู้ว่ากดถูกใจแล้วหรือยังโดยไม่ต้อง query ซ้ำ กดปุ่มแล้วอัปเดต Set ทันที (optimistic) ถ้าบันทึกไม่สำเร็จจะย้อนค่ากลับพร้อมแจ้งเตือน
- ล็อกเอาต์แล้วล้าง state ทั้งสองตัว ไม่ให้ข้อมูลค้างข้ามบัญชี
- หน้า `/u/:username` ไม่ใช้ `LibraryContext` เพราะเป็นข้อมูลของคนอื่น ดึงด้วย query แยกในหน้านั้นเอง

## 6. แบ่งงานกันยังไง

- **พอ:** หน้าแรก รายการหนัง รายละเอียดหนัง และเชื่อมต่อ TMDB API ผ่าน Node.js
- **เติ้ล:** สมัครสมาชิก/เข้าสู่ระบบด้วย Supabase Auth ตรวจสอบฟอร์ม `AuthContext` และหน้าตั้งค่าโปรไฟล์
- **อั๋น:** ห้องสมุด (ถูกใจ/อยากดู) `LibraryContext` และหน้าโปรไฟล์ที่แชร์ `/u/:username`
- **ร่วมกัน:** ออกแบบ Supabase schema และ RLS ปรับหน้าจอมือถือ ทดสอบ และจัดทำเอกสาร
