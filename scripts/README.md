# Zodiac Collections Fix Scripts

This directory contains scripts to fix the zodiac collections consistency issue in the database.

## Problem Description

Products in the "zodiaco" category should be organized into collections based on their zodiac sign (Aries, Tauro, Géminis, etc.). However, many zodiac-related products are missing their proper collection assignments because:

1. Collections for many zodiac signs don't exist
2. Products with detectable zodiac signs aren't assigned to the correct collections

## Solution

We've created two scripts to address this issue:

### 1. Preview Script (`preview-zodiac-collections.ts`)

**Purpose**: Analyzes the current state and shows what changes would be made WITHOUT executing them.

**Usage**:
```bash
npm run preview-zodiac
```

**What it does**:
- Scans all products in the "zodiaco" category
- Detects zodiac signs from product names and tags
- Identifies missing collections that need to be created
- Shows which products need reassignment
- **Generates actual SQL queries** that will be executed
- **Uses sequential collection IDs** starting from col_052
- Provides a detailed execution plan

### 2. Fix Script (`fix-zodiac-collections.ts`)

**Purpose**: Actually executes the fixes to create collections and update product assignments.

**Usage**:
```bash
npm run fix-zodiac
```

**What it does**:
- Creates missing zodiac sign collections with **sequential IDs** (col_052, col_053, etc.)
- Updates product collection assignments
- Provides progress feedback and final summary

### 3. Backup Script (`backup-database.sh`)

**Purpose**: Creates a backup of the 'real' schema before making changes.

**Usage**:
```bash
npm run backup-db
```

**What it does**:
- Backs up only the 'real' schema from your Supabase database
- Creates timestamped backup files in `backups/` directory
- Provides restore instructions

## How the Zodiac Detection Works

The scripts use a comprehensive mapping of zodiac signs and their variations:

### Supported Signs (Spanish):
- **aries** - Aries (21 marzo - 19 abril)
- **tauro** - Tauro (20 abril - 20 mayo)  
- **geminis** - Géminis (21 mayo - 20 junio)
- **cancer** - Cáncer (21 junio - 22 julio)
- **leo** - Leo (23 julio - 22 agosto)
- **virgo** - Virgo (23 agosto - 22 septiembre)
- **libra** - Libra (23 septiembre - 22 octubre)
- **escorpio** - Escorpio (23 octubre - 21 noviembre)
- **sagitario** - Sagitario (22 noviembre - 21 diciembre)
- **capricornio** - Capricornio (22 diciembre - 19 enero)
- **acuario** - Acuario (20 enero - 18 febrero)
- **piscis** - Piscis (19 febrero - 20 marzo)

### Alternative Spellings Recognized:
- **With Spanish accents**: Géminis → geminis, Cáncer → cancer, León → leo
- **English variants**: gemini → geminis, scorpio → escorpio, aquarius → acuario
- **Other variations**: capricorn → capricornio, taurus → tauro, sagittarius → sagitario

### Detection Method:
The script searches for zodiac signs in:
1. Product name
2. Product tags

**Advanced Features**:
- **Accent normalization**: Detects "Géminis" and "geminis" as the same sign
- **Word boundary matching**: Avoids false positives (e.g., "escorpio" won't match "escorpioneta")
- **Case insensitive**: Works with any capitalization
- **Diacritic removal**: Automatically handles Spanish tildes and accents

## Prerequisites

Before running the scripts, ensure:

1. **Database Connection**: Your `DATABASE_URL` environment variable is properly set
2. **Dependencies**: Run `npm install` to install required packages (tsx, prisma)
3. **Zodiac Category**: The "zodiaco" category must exist in your database

## Recommended Workflow

1. **First, backup your database** (targeting the 'real' schema):
   ```bash
   npm run backup-db
   ```

2. **Run the preview** to see what changes will be made (including SQL queries):
   ```bash
   npm run preview-zodiac
   ```

3. **Review the output** to ensure the detected signs and SQL queries are correct

4. **Execute the fix** if everything looks good:
   ```bash
   npm run fix-zodiac
   ```

5. **Verify results** in your admin dashboard or database

## Example Output

### Preview Script Output:
```
🔍 PREVIEW MODE: Zodiac Collections Analysis

📋 Step 1: Finding zodiac category...
✅ Found zodiac category: zodiaco (ID: cat_001)

📋 Step 2: Getting existing collections...
✅ Found 2 existing collections:
   - aries (ID: col_002)
   - todos (ID: col_003)

📋 Step 3: Analyzing zodiac products...
✅ Found 50 products in zodiac category

🔍 ANALYSIS RESULTS:
════════════════════════════════════════════════════════════════
📊 Summary:
   - Total products in zodiac category: 50
   - Products with detected zodiac signs: 45
   - Products without detected signs: 5
   - Unique zodiac signs detected: 10
   - Missing collections needed: 9
   - Products needing reassignment: 3

🎯 DETECTED ZODIAC SIGNS:
   - acuario: 4 products ❌ Missing collection
   - aries: 5 products ✅ Has collection
   - cancer: 3 products ❌ Missing collection
   - capricornio: 6 products ❌ Missing collection
   ...

🆕 COLLECTIONS TO BE CREATED:
   - Collection "acuario" (ID: col_052)
     Description: Diseños inspirados en el signo zodiacal Acuario (20 enero - 18 febrero)
     Will contain 4 products
   ...

💻 SQL QUERIES TO BE EXECUTED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- CREATE COLLECTION QUERIES:
INSERT INTO "Collection" ("id", "name", "description", "image", "createdAt", "categoryId") 
VALUES ('col_052', 'acuario', 'Diseños inspirados en el signo zodiacal Acuario (20 enero - 18 febrero)', NULL, NOW(), 'cat_001');

-- UPDATE PRODUCTS TO NEW COLLECTIONS:
UPDATE "Product" SET "collectionId" = 'col_052' WHERE "id" = 'prod_123'; -- Product: Pastel de corazón de Acuario -> acuario
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 EXECUTION PLAN:
1. Create 9 new collections for missing zodiac signs
2. Update 42 products to correct collections
3. Keep 5 products unchanged (no zodiac sign detected)

To execute these changes, run: npm run fix-zodiac
```

## Safety Features

- **Dry-run preview**: Always preview changes before executing
- **Word boundary matching**: Prevents false positive zodiac sign detection
- **Existing collection preservation**: Won't duplicate existing collections
- **Transaction safety**: Database operations are wrapped in proper error handling
- **Detailed logging**: Comprehensive output for troubleshooting

## Troubleshooting

### Common Issues:

1. **"Zodiac category not found"**:
   - Ensure a category named "zodiaco" exists in your database
   - Check case sensitivity

2. **"Database connection failed"**:
   - Verify your `DATABASE_URL` environment variable
   - Ensure your database is running and accessible

3. **No zodiac signs detected**:
   - Check if product names/tags actually contain zodiac sign keywords
   - Review the zodiac signs mapping in the script

4. **Permission errors**:
   - Ensure your database user has CREATE and UPDATE permissions
   - Check if you're running in a production environment with restrictions

### Manual Verification:

After running the fix script, you can verify the results by:

1. Checking the Collections table for new zodiac sign collections
2. Verifying products have correct `collectionId` assignments
3. Testing the admin dashboard to see if products are properly categorized

## Need Help?

If you encounter any issues or need to modify the zodiac sign detection logic, the main configuration is in the `ZODIAC_SIGNS` constant at the top of each script file. 