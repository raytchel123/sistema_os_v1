import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKFILL_DIR = './backfill';
const DEFAULT_BRAND = 'RAYTCHEL';
const BATCH_SIZE = 5; // Process 5 files at a time
const DELAY_MS = 1000; // 1 second between batches

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

interface BackfillStats {
  totalFiles: number;
  processed: number;
  created: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  // For Node.js environment, we'd need a different PDF library
  // This is a placeholder - in practice, you'd use pdf-parse or similar
  console.log(`⚠️ PDF extraction not implemented in Node.js version: ${filePath}`);
  return `PDF content from ${path.basename(filePath)} - please convert to .txt manually`;
}

async function processFile(filePath: string, fileName: string): Promise<{ created: number; skipped: number; error?: string }> {
  try {
    console.log(`📄 Processing: ${fileName}`);
    
    let text: string;
    const ext = path.extname(fileName).toLowerCase();
    
    if (ext === '.pdf') {
      text = await extractTextFromPDF(filePath);
    } else {
      text = await fs.readFile(filePath, 'utf8');
    }

    if (!text.trim()) {
      return { created: 0, skipped: 0, error: 'Empty file' };
    }

    // Generate idempotency key from filename
    const idempotencyKey = createHash('sha256').update(fileName).digest('hex').substring(0, 16);

    // Step 1: Parse with AI
    const parseResponse = await fetch(`${SUPABASE_URL}/functions/v1/os-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Idempotency-Key': `parse-${idempotencyKey}`
      },
      body: JSON.stringify({ 
        text, 
        brandDefault: DEFAULT_BRAND,
        source: 'BACKFILL',
        fileName 
      })
    });

    if (!parseResponse.ok) {
      const error = await parseResponse.text();
      throw new Error(`Parse failed: ${error}`);
    }

    const parseData = await parseResponse.json();
    const items = parseData.items || [];

    if (items.length === 0) {
      return { created: 0, skipped: 0, error: 'No OS detected' };
    }

    console.log(`  🔍 Detected ${items.length} OS items`);

    // Step 2: Commit to database
    const commitResponse = await fetch(`${SUPABASE_URL}/functions/v1/os-intake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Idempotency-Key': `commit-${idempotencyKey}`
      },
      body: JSON.stringify({ 
        items: items.map((item: any) => ({
          ...item,
          source: 'BACKFILL',
          import_metadata: {
            fileName,
            processedAt: new Date().toISOString(),
            batchId: idempotencyKey
          }
        }))
      })
    });

    if (!commitResponse.ok) {
      const error = await commitResponse.text();
      throw new Error(`Commit failed: ${error}`);
    }

    const commitData = await commitResponse.json();
    console.log(`  ✅ Created: ${commitData.created}, Skipped: ${commitData.skipped}`);

    return {
      created: commitData.created || 0,
      skipped: commitData.skipped || 0
    };

  } catch (error) {
    console.error(`  ❌ Error processing ${fileName}:`, error);
    return { 
      created: 0, 
      skipped: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runBackfill(): Promise<void> {
  console.log('🚀 Starting OS backfill process...');
  console.log(`📁 Source directory: ${BACKFILL_DIR}`);
  console.log(`🏷️ Default brand: ${DEFAULT_BRAND}`);
  console.log(`⚡ Batch size: ${BATCH_SIZE} files`);
  
  const stats: BackfillStats = {
    totalFiles: 0,
    processed: 0,
    created: 0,
    skipped: 0,
    errors: []
  };

  try {
    // Check if backfill directory exists
    try {
      await fs.access(BACKFILL_DIR);
    } catch {
      console.log(`📁 Creating backfill directory: ${BACKFILL_DIR}`);
      await fs.mkdir(BACKFILL_DIR, { recursive: true });
      console.log(`ℹ️ Place your .txt, .md, .pdf files in ${BACKFILL_DIR} and run again`);
      return;
    }

    // Get all supported files
    const allFiles = await fs.readdir(BACKFILL_DIR);
    const supportedFiles = allFiles.filter(f => 
      /\.(txt|md|pdf|docx)$/i.test(f)
    );

    stats.totalFiles = supportedFiles.length;

    if (stats.totalFiles === 0) {
      console.log(`ℹ️ No supported files found in ${BACKFILL_DIR}`);
      console.log('   Supported formats: .txt, .md, .pdf, .docx');
      return;
    }

    console.log(`📊 Found ${stats.totalFiles} files to process`);

    // Process files in batches
    for (let i = 0; i < supportedFiles.length; i += BATCH_SIZE) {
      const batch = supportedFiles.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(supportedFiles.length / BATCH_SIZE)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (fileName) => {
        const filePath = path.join(BACKFILL_DIR, fileName);
        const result = await processFile(filePath, fileName);
        
        stats.processed++;
        stats.created += result.created;
        stats.skipped += result.skipped;
        
        if (result.error) {
          stats.errors.push({ file: fileName, error: result.error });
        }

        return result;
      });

      await Promise.all(batchPromises);

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < supportedFiles.length) {
        console.log(`⏳ Waiting ${DELAY_MS}ms before next batch...`);
        await sleep(DELAY_MS);
      }
    }

  } catch (error) {
    console.error('❌ Backfill process failed:', error);
    process.exit(1);
  }

  // Final report
  console.log('\n📊 BACKFILL COMPLETE');
  console.log('='.repeat(50));
  console.log(`📁 Total files: ${stats.totalFiles}`);
  console.log(`✅ Processed: ${stats.processed}`);
  console.log(`🆕 Created OS: ${stats.created}`);
  console.log(`⏭️ Skipped (duplicates): ${stats.skipped}`);
  console.log(`❌ Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  • ${file}: ${error}`);
    });
  }

  console.log('\n🎉 Backfill process completed!');
}

// Run the backfill
runBackfill().catch(console.error);