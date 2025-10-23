const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing required environment variables SUPABASE_URL and/or SUPABASE_ANON_KEY');
  console.error('Please create a .env file with these variables. See .env.example for reference.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateSchema() {
  try {
    console.log('Updating database schema...');
    
    // Drop the existing constraint
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE events DROP CONSTRAINT IF EXISTS events_persona_check;'
    });
    
    if (dropError) {
      console.log('Drop constraint error:', dropError);
    } else {
      console.log('Successfully dropped old constraint');
    }
    
    // Add the new constraint
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE events ADD CONSTRAINT events_persona_check 
            CHECK (persona IN ('athlete', 'commuter', 'outdoor', 'family'));`
    });
    
    if (addError) {
      console.log('Add constraint error:', addError);
    } else {
      console.log('Successfully added new constraint');
    }
    
    console.log('Schema update completed!');
    
  } catch (error) {
    console.error('Error updating schema:', error);
  }
}

updateSchema();
