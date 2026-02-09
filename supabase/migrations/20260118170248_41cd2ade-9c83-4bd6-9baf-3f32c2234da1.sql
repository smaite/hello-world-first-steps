-- Create enums for roles and transaction types
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE public.currency_type AS ENUM ('NPR', 'INR');
CREATE TYPE public.transaction_type AS ENUM ('buy', 'sell', 'credit_given', 'credit_received');
CREATE TYPE public.payment_method AS ENUM ('cash', 'online');

-- Profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'staff',
    UNIQUE (user_id, role)
);

-- Permissions table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff permissions (granular permissions per staff)
CREATE TABLE public.staff_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (staff_id, permission_id)
);

-- Exchange settings (fixed rate)
CREATE TABLE public.exchange_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npr_to_inr_rate DECIMAL(10, 4) NOT NULL DEFAULT 0.625,
    inr_to_npr_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.6,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    credit_limit DECIMAL(15, 2) NOT NULL DEFAULT 0,
    credit_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank accounts table
CREATE TABLE public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT,
    account_type TEXT DEFAULT 'savings',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES auth.users(id) NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    transaction_type transaction_type NOT NULL,
    from_currency currency_type NOT NULL,
    to_currency currency_type NOT NULL,
    from_amount DECIMAL(15, 2) NOT NULL,
    to_amount DECIMAL(15, 2) NOT NULL,
    exchange_rate DECIMAL(10, 4) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    is_credit BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit transactions (for tracking credit payments)
CREATE TABLE public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    staff_id UUID REFERENCES auth.users(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_given', 'credit_paid')),
    payment_method payment_method NOT NULL DEFAULT 'cash',
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    reference_transaction_id UUID REFERENCES public.transactions(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff cash tracker (opening/closing balance)
CREATE TABLE public.staff_cash_tracker (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    opening_npr DECIMAL(15, 2) NOT NULL DEFAULT 0,
    opening_inr DECIMAL(15, 2) NOT NULL DEFAULT 0,
    closing_npr DECIMAL(15, 2),
    closing_inr DECIMAL(15, 2),
    total_npr_in DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_npr_out DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_inr_in DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_inr_out DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    closed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (staff_id, date)
);

-- Bank transactions (for tracking online payments)
CREATE TABLE public.bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id UUID REFERENCES public.bank_accounts(id) NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id),
    credit_transaction_id UUID REFERENCES public.credit_transactions(id),
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily reports table
CREATE TABLE public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES auth.users(id) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_transactions INTEGER NOT NULL DEFAULT 0,
    total_npr_sold DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_npr_bought DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_inr_sold DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_inr_bought DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_credit_given DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_credit_received DECIMAL(15, 2) NOT NULL DEFAULT 0,
    profit_loss DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (staff_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_cash_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Check if current user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'owner')
$$;

-- Check if current user is manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'manager')
$$;

-- Check if current user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'staff')
$$;

-- Check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff_permissions sp
        JOIN public.permissions p ON sp.permission_id = p.id
        WHERE sp.staff_id = auth.uid()
          AND p.name = _permission_name
    )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Owner and manager can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owner can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_owner());

-- Permissions policies
CREATE POLICY "Owner can manage permissions" ON public.permissions
    FOR ALL USING (public.is_owner());

CREATE POLICY "Manager and staff can view permissions" ON public.permissions
    FOR SELECT USING (public.is_manager() OR public.is_staff());

-- Staff permissions policies
CREATE POLICY "Owner can manage staff permissions" ON public.staff_permissions
    FOR ALL USING (public.is_owner());

CREATE POLICY "Manager can view staff permissions" ON public.staff_permissions
    FOR SELECT USING (public.is_manager());

CREATE POLICY "Staff can view own permissions" ON public.staff_permissions
    FOR SELECT USING (staff_id = auth.uid());

-- Exchange settings policies
CREATE POLICY "Owner can manage exchange settings" ON public.exchange_settings
    FOR ALL USING (public.is_owner());

CREATE POLICY "Authenticated users can view exchange settings" ON public.exchange_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Customers policies
CREATE POLICY "Owner and manager full access to customers" ON public.customers
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view customers with permission" ON public.customers
    FOR SELECT USING (public.is_staff() AND public.has_permission('view_customers'));

CREATE POLICY "Staff can create customers with permission" ON public.customers
    FOR INSERT WITH CHECK (public.is_staff() AND public.has_permission('create_customer'));

CREATE POLICY "Staff can update customers with permission" ON public.customers
    FOR UPDATE USING (public.is_staff() AND public.has_permission('edit_customer'));

-- Bank accounts policies
CREATE POLICY "Owner and manager full access to bank accounts" ON public.bank_accounts
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view bank accounts with permission" ON public.bank_accounts
    FOR SELECT USING (public.is_staff() AND public.has_permission('view_bank_accounts'));

-- Transactions policies
CREATE POLICY "Owner and manager full access to transactions" ON public.transactions
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view own transactions" ON public.transactions
    FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can create transactions" ON public.transactions
    FOR INSERT WITH CHECK (staff_id = auth.uid());

-- Credit transactions policies
CREATE POLICY "Owner and manager full access to credit transactions" ON public.credit_transactions
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view own credit transactions" ON public.credit_transactions
    FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can create credit transactions" ON public.credit_transactions
    FOR INSERT WITH CHECK (staff_id = auth.uid());

-- Staff cash tracker policies
CREATE POLICY "Owner and manager full access to cash tracker" ON public.staff_cash_tracker
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view own cash tracker" ON public.staff_cash_tracker
    FOR SELECT USING (staff_id = auth.uid());

CREATE POLICY "Staff can manage own cash tracker" ON public.staff_cash_tracker
    FOR INSERT WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff can update own cash tracker" ON public.staff_cash_tracker
    FOR UPDATE USING (staff_id = auth.uid());

-- Bank transactions policies
CREATE POLICY "Owner and manager full access to bank transactions" ON public.bank_transactions
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view bank transactions with permission" ON public.bank_transactions
    FOR SELECT USING (public.is_staff() AND public.has_permission('view_bank_transactions'));

-- Daily reports policies
CREATE POLICY "Owner and manager full access to daily reports" ON public.daily_reports
    FOR ALL USING (public.is_owner() OR public.is_manager());

CREATE POLICY "Staff can view own daily reports" ON public.daily_reports
    FOR SELECT USING (staff_id = auth.uid());

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
    ('view_customers', 'View customer directory', 'customers'),
    ('create_customer', 'Create new customers', 'customers'),
    ('edit_customer', 'Edit customer information', 'customers'),
    ('delete_customer', 'Delete customers', 'customers'),
    ('view_customer_credit', 'View customer credit details', 'customers'),
    ('manage_customer_credit', 'Manage customer credit limits', 'customers'),
    ('view_transactions', 'View all transactions', 'transactions'),
    ('create_transaction', 'Create exchange transactions', 'transactions'),
    ('void_transaction', 'Void transactions', 'transactions'),
    ('view_bank_accounts', 'View bank account details', 'banking'),
    ('view_bank_transactions', 'View bank transactions', 'banking'),
    ('record_bank_transaction', 'Record bank transactions', 'banking'),
    ('view_daily_reports', 'View daily sales reports', 'reports'),
    ('view_profit_loss', 'View profit/loss reports', 'reports'),
    ('view_all_staff_reports', 'View reports for all staff', 'reports'),
    ('manage_exchange_rate', 'Manage exchange rates', 'settings');

-- Insert default exchange rate
INSERT INTO public.exchange_settings (npr_to_inr_rate, inr_to_npr_rate) VALUES (0.625, 1.6);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchange_settings_updated_at
    BEFORE UPDATE ON public.exchange_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    -- Check if this is the first user, make them owner
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'owner') THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();