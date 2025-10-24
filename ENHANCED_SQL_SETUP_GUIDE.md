# Enhanced Supabase + Clerk Setup Guide

## 🚀 Complete SQL Setup Script

Thay vì sử dụng `enhanced-setup.ts` (có vấn đề kết nối), bạn có thể sử dụng file SQL hoàn chỉnh này để setup tất cả những gì cần thiết.

## 📁 File SQL: `supabase/enhanced-setup.sql`

File này bao gồm tất cả những gì cần thiết cho một dự án Supabase + Clerk hoàn chỉnh:

### **🔧 Những gì được tạo:**

1. **Extensions:**
   - ✅ `uuid-ossp` - UUID generation
   - ✅ `pgcrypto` - Cryptographic functions
   - ✅ `wrappers` - Foreign Data Wrapper support
   - ✅ `wasm` - WebAssembly support for HTTP requests

2. **Database Schema:**
   - ✅ `profiles` - User profiles table
   - ✅ `tasks` - Tasks management table
   - ✅ `organizations` - Organizations table
   - ✅ `organization_members` - Organization membership
   - ✅ `webhook_events` - Webhook event logging

3. **Security (RLS):**
   - ✅ Row Level Security enabled on all tables
   - ✅ Comprehensive RLS policies
   - ✅ User-based access control

4. **Functions & Triggers:**
   - ✅ Auto-update timestamps
   - ✅ Auto-create profiles on user signup
   - ✅ Webhook event processing
   - ✅ Data synchronization

5. **Performance:**
   - ✅ Optimized indexes
   - ✅ Query performance improvements

6. **Clerk Integration:**
   - ✅ Foreign Data Wrapper setup (commented)
   - ✅ Direct Clerk data access capability
   - ✅ User synchronization

## 🚀 Cách sử dụng:

### **Bước 1: Chạy SQL Script**

```bash
# Cách 1: Sử dụng Supabase Dashboard
# 1. Mở Supabase Dashboard
# 2. Vào SQL Editor
# 3. Copy nội dung file supabase/enhanced-setup.sql
# 4. Paste và chạy

# Cách 2: Sử dụng Supabase CLI
supabase db reset
supabase db push
```

### **Bước 2: Cấu hình Clerk Wrapper (Optional)**

Nếu muốn sử dụng Clerk Wrapper để query Clerk data trực tiếp:

```sql
-- Uncomment và cấu hình phần Clerk Wrapper trong file SQL
-- Thay 'YOUR_CLERK_SECRET_KEY' bằng Clerk secret key thực tế
```

### **Bước 3: Test Setup**

```bash
# Chạy basic setup
npx next-supabase-clerk-setup install --all --webhooks --force

# Test connections
npx next-supabase-clerk-setup check --detailed

# Start development
npm run dev

# Test tại: http://localhost:3000/connection-test
```

## 📋 Các bảng được tạo:

### **1. Profiles Table**
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  bio TEXT,
  location TEXT,
  phone TEXT,
  email TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **2. Tasks Table**
```sql
CREATE TABLE public.tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **3. Organizations Table**
```sql
CREATE TABLE public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **4. Webhook Events Table**
```sql
CREATE TABLE public.webhook_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  source TEXT NOT NULL, -- 'clerk' or 'supabase'
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔒 Security Features:

### **RLS Policies:**
- ✅ Users can only see their own data
- ✅ Organization members can see organization data
- ✅ Public profiles are viewable by everyone
- ✅ Webhook events are service-role only

### **Data Validation:**
- ✅ Username format validation
- ✅ Email format validation
- ✅ Priority enum validation
- ✅ Role enum validation

## 🚀 Advanced Features:

### **1. Auto Profile Creation**
Khi user signup, profile sẽ được tạo tự động từ Clerk data.

### **2. Webhook Processing**
Webhook events từ Clerk sẽ được xử lý tự động để sync data.

### **3. Clerk Data Access**
Có thể query Clerk data trực tiếp từ Supabase (nếu enable wrapper).

### **4. Real-time Updates**
Tất cả tables có `updated_at` timestamps tự động.

## 🎯 Kết quả:

Sau khi chạy SQL script, bạn sẽ có:

- ✅ **Complete database schema** với RLS
- ✅ **User management** với profiles
- ✅ **Task management** system
- ✅ **Organization management** system
- ✅ **Webhook infrastructure** cho real-time sync
- ✅ **Performance optimized** với indexes
- ✅ **Security hardened** với RLS policies

## 🔧 Troubleshooting:

### **Nếu gặp lỗi:**
1. Kiểm tra Supabase project permissions
2. Đảm bảo có service role key
3. Kiểm tra RLS policies
4. Verify environment variables

### **Nếu muốn reset:**
```sql
-- Drop all tables (cẩn thận!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

**File SQL này cung cấp một foundation hoàn chỉnh cho dự án Supabase + Clerk!** 🚀
