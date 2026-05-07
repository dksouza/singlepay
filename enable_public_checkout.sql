-- Allow public access to checkouts by hash
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view checkouts by hash" ON public.checkouts;
CREATE POLICY "Public can view checkouts by hash"
  ON public.checkouts FOR SELECT
  USING (true);

-- Allow public access to products (needed to show product info on checkout)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
  ON public.products FOR SELECT
  USING (true);

-- Allow public access to stripe_configs (needed to get publishable keys for checkout)
ALTER TABLE public.stripe_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view stripe configs" ON public.stripe_configs;
CREATE POLICY "Public can view stripe configs"
  ON public.stripe_configs FOR SELECT
  USING (true);
