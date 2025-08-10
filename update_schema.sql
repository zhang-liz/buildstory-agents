-- Update the events table to use water bottle personas instead of dev/investor/user
-- This fixes the constraint violation error

-- First, drop the existing constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_persona_check;

-- Add the new constraint with water bottle persona values
ALTER TABLE events ADD CONSTRAINT events_persona_check 
CHECK (persona IN ('athlete', 'commuter', 'outdoor', 'family'));

-- Verify the change
SELECT 
    table_name, 
    constraint_name, 
    check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'events_persona_check';
