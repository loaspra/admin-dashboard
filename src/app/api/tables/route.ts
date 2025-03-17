import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/app/lib/prisma';


export async function GET() {
  try {
    // Access the Prisma DMMF
    const dmmf = (Prisma as any).dmmf.datamodel;

    const result = await prisma.$queryRaw`SELECT current_user`;
    console.log('result:', result);
    // return NextResponse.json({ currentUser: result[0].current_user });

    
    // Extract models with their actual database names
    const models = dmmf.models
      // Filter out any system models you want to exclude
      .filter((model: any) => !model.name.startsWith('_'))
      .map((model: any) => ({
        table_name: model.name, // Use model name for consistent API
        db_name: model.dbName || model.name, // Actual DB table name
        schema_name: 'public'
      }));
    
    return NextResponse.json(models);
  } catch (error: any) {
    console.error('Error fetching table names:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}