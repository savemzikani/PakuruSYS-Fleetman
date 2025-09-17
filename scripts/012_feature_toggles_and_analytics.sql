-- Feature toggles and analytics tables for Phase 2
-- This enables companies to have different feature sets based on subscription

-- Feature toggles table
CREATE TABLE feature_toggles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, feature_name)
);

-- Customer ratings and feedback table
CREATE TABLE customer_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    feedback TEXT,
    service_aspects JSONB, -- JSON object for detailed ratings (punctuality, communication, etc.)
    is_anonymous BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing load_tracking table
ALTER TABLE load_tracking ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE load_tracking ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE load_tracking ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE load_tracking ADD COLUMN IF NOT EXISTS notes TEXT;

-- Payment methods table for customer portal
CREATE TABLE customer_payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_type VARCHAR(50) NOT NULL, -- 'card', 'bank_transfer', 'mobile_money'
    provider VARCHAR(100), -- 'visa', 'mastercard', 'mpesa', 'ecocash', etc.
    masked_details VARCHAR(100), -- Last 4 digits of card, masked account number
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB, -- Store provider-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES customer_payment_methods(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency currency_code DEFAULT 'USD',
    transaction_reference VARCHAR(255) UNIQUE,
    gateway_reference VARCHAR(255), -- Reference from payment gateway
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
    gateway_response JSONB, -- Store full gateway response
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics aggregation tables for performance
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_loads INTEGER DEFAULT 0,
    completed_loads INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    expenses DECIMAL(12,2) DEFAULT 0,
    active_vehicles INTEGER DEFAULT 0,
    active_drivers INTEGER DEFAULT 0,
    customer_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, date)
);

-- Subscription management
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS payment_method_id VARCHAR(255);

-- Create indexes for performance
CREATE INDEX idx_feature_toggles_company_feature ON feature_toggles(company_id, feature_name);
CREATE INDEX idx_customer_ratings_company ON customer_ratings(company_id);
CREATE INDEX idx_customer_ratings_customer ON customer_ratings(customer_id);
CREATE INDEX idx_customer_ratings_load ON customer_ratings(load_id);
CREATE INDEX IF NOT EXISTS idx_load_tracking_load_id ON load_tracking(load_id);
CREATE INDEX IF NOT EXISTS idx_load_tracking_created_at ON load_tracking(created_at);
CREATE INDEX idx_payment_methods_customer ON customer_payment_methods(customer_id);
CREATE INDEX idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_daily_analytics_company_date ON daily_analytics(company_id, date);

-- Row Level Security policies
ALTER TABLE feature_toggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_ratings ENABLE ROW LEVEL SECURITY;
-- Enable RLS only if table exists and RLS not already enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'load_tracking') THEN
        ALTER TABLE load_tracking ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;
ALTER TABLE customer_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_analytics ENABLE ROW LEVEL SECURITY;

-- Feature toggles policies
CREATE POLICY "Users can view their company's feature toggles" ON feature_toggles
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Company admins can manage feature toggles" ON feature_toggles
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'company_admin')
        )
    );

-- Customer ratings policies
CREATE POLICY "Users can view ratings for their company" ON customer_ratings
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Customers can create ratings" ON customer_ratings
    FOR INSERT WITH CHECK (
        customer_id IN (
            SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Load tracking policies (only create if table was created)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'load_tracking' AND policyname = 'Users can view tracking for their company loads') THEN
        CREATE POLICY "Users can view tracking for their company loads" ON load_tracking
            FOR SELECT USING (
                load_id IN (
                    SELECT id FROM loads 
                    WHERE company_id IN (
                        SELECT company_id FROM profiles WHERE id = auth.uid()
                    )
                )
            );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'load_tracking' AND policyname = 'Drivers and dispatchers can add tracking updates') THEN
        CREATE POLICY "Drivers and dispatchers can add tracking updates" ON load_tracking
            FOR INSERT WITH CHECK (
                load_id IN (
                    SELECT id FROM loads 
                    WHERE company_id IN (
                        SELECT company_id FROM profiles WHERE id = auth.uid()
                    )
                )
                AND updated_by = auth.uid()
            );
    END IF;
END $$;

-- Payment methods policies
CREATE POLICY "Customers can manage their payment methods" ON customer_payment_methods
    FOR ALL USING (
        customer_id IN (
            SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'
        )
    );

-- Payment transactions policies
CREATE POLICY "Users can view transactions for their company" ON payment_transactions
    FOR SELECT USING (
        invoice_id IN (
            SELECT id FROM invoices 
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Analytics policies
CREATE POLICY "Users can view their company analytics" ON daily_analytics
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Default feature toggles for new companies
INSERT INTO feature_toggles (company_id, feature_name, is_enabled)
SELECT 
    id as company_id,
    unnest(ARRAY[
        'real_time_tracking',
        'advanced_analytics', 
        'customer_portal',
        'expense_management',
        'document_management',
        'multi_currency',
        'mobile_app',
        'api_access',
        'custom_reports',
        'bulk_operations'
    ]) as feature_name,
    CASE 
        WHEN subscription_plan = 'basic' THEN false
        WHEN subscription_plan = 'premium' THEN true
        ELSE true -- trial gets all features
    END as is_enabled
FROM companies
WHERE NOT EXISTS (
    SELECT 1 FROM feature_toggles WHERE feature_toggles.company_id = companies.id
);

-- Add updated_at triggers
CREATE TRIGGER update_feature_toggles_updated_at BEFORE UPDATE ON feature_toggles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_ratings_updated_at BEFORE UPDATE ON customer_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_payment_methods_updated_at BEFORE UPDATE ON customer_payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
