import { supabaseAdmin } from '../../../../lib/supabase-admin'

export async function GET() {
  try {
    console.log('[SupabaseTables] Starting table structure check...')
    
    if (!supabaseAdmin) {
      console.error('[SupabaseTables] Supabase admin client is null')
      return Response.json({
        success: false,
        message: 'Supabase admin client is not configured',
        tables: []
      }, { status: 503 })
    }

    const tables = []
    const requiredTables = ['users', 'merchants', 'events', 'prices', 'orders', 'tickets']

    // 检查每个必需的表
    for (const tableName of requiredTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(tableName)
          .select('*')
          .limit(1)

        if (error) {
          console.error(`[SupabaseTables] Error checking table ${tableName}:`, error)
          tables.push({
            name: tableName,
            exists: false,
            error: error.message,
            required: true
          })
        } else {
          console.log(`[SupabaseTables] Table ${tableName} exists with ${data?.length || 0} records`)
          tables.push({
            name: tableName,
            exists: true,
            recordCount: data?.length || 0,
            required: true
          })
        }
      } catch (err) {
        console.error(`[SupabaseTables] Exception checking table ${tableName}:`, err)
        tables.push({
          name: tableName,
          exists: false,
          error: err.message,
          required: true
        })
      }
    }

    const existingTables = tables.filter(t => t.exists)
    const missingTables = tables.filter(t => !t.exists && t.required)

    console.log(`[SupabaseTables] Found ${existingTables.length}/${requiredTables.length} required tables`)

    return Response.json({
      success: true,
      message: `Found ${existingTables.length}/${requiredTables.length} required tables`,
      tables: tables,
      summary: {
        total: requiredTables.length,
        existing: existingTables.length,
        missing: missingTables.length,
        missingTables: missingTables.map(t => t.name)
      }
    })

  } catch (error) {
    console.error('[SupabaseTables] Unexpected error:', error)
    return Response.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error.message,
      tables: []
    }, { status: 500 })
  }
}
