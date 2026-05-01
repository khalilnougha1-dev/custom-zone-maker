CREATE TABLE public.cash_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cash tx" ON public.cash_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cash tx" ON public.cash_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cash tx" ON public.cash_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cash tx" ON public.cash_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cash_tx_user_date ON public.cash_transactions(user_id, created_at DESC);
CREATE INDEX idx_cash_tx_type ON public.cash_transactions(user_id, type);