DROP TRIGGER IF EXISTS trg_increment_stock ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_decrement_stock ON public.sale_items;

WITH duplicate_movements AS (
  SELECT
    id,
    user_id,
    product_id,
    quantity_change,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, product_id, movement_type, quantity_change, reference_type, reference_id, created_at
      ORDER BY id
    ) AS rn
  FROM public.stock_movements
  WHERE movement_type IN ('purchase', 'sale')
), extra_effect AS (
  SELECT user_id, product_id, COALESCE(SUM(quantity_change), 0) AS extra_quantity
  FROM duplicate_movements
  WHERE rn > 1
  GROUP BY user_id, product_id
)
UPDATE public.products p
SET stock_quantity = p.stock_quantity - e.extra_quantity,
    updated_at = now()
FROM extra_effect e
WHERE p.id = e.product_id
  AND p.user_id = e.user_id;

DELETE FROM public.stock_movements sm
USING (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, product_id, movement_type, quantity_change, reference_type, reference_id, created_at
        ORDER BY id
      ) AS rn
    FROM public.stock_movements
    WHERE movement_type IN ('purchase', 'sale')
  ) ranked
  WHERE rn > 1
) dup
WHERE sm.id = dup.id;