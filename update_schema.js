const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jhpymmgxkhczujuepvjs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocHltbWd4a2hjenVqdWVwdmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NzQ2MzcsImV4cCI6MjA3MDM1MDYzN30.6dEGZ6g3LZ4l1c9sBW-KY6dVmNNzj3OWNvm3qkzfrm4';

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
