-- Make user_id nullable in unidades table to allow matriz users to create units without immediate ownership
ALTER TABLE public.unidades 
ALTER COLUMN user_id DROP NOT NULL;

-- Add a comment to explain the logic
COMMENT ON COLUMN public.unidades.user_id IS 'User ID of the unit owner. NULL for units created by matriz users that have not been claimed yet.';