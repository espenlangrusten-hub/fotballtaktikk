import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ijssxdoehpuxucjypckk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlqc3N4ZG9laHB1eHVjanlwY2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTg2NDAsImV4cCI6MjA5NDgzNDY0MH0.v0OdL8o3VhcIRzrGr37Y5ipwy4uknd0OsvTWPp_DoJs'
)
