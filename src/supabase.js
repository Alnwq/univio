import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zmdpuctxcqyyghdlrtan.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZHB1Y3R4Y3F5eWdoZGxydGFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDg0OTQsImV4cCI6MjA4NjkyNDQ5NH0.XWMT9Ehv9b1sVDpi-y6-sArxBd0v8Iq_WLjuhM8f5P4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)