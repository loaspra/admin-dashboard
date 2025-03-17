import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Function to get the correct model with proper case sensitivity
function getModelByName(tableName: string) {
  // First, check if the exact case exists
  if ((prisma as any)[tableName]) {
    return (prisma as any)[tableName];
  }
  
  // If not found, try to find a case-insensitive match
  const modelName = Object.keys(prisma).find(
    key => key.toLowerCase() === tableName.toLowerCase() &&
    !key.startsWith('$') && 
    !key.startsWith('_') && 
    key !== 'constructor'
  );
  
  if (!modelName) {
    return null;
  }
  
  return (prisma as any)[modelName];
}

export async function GET(
  request: Request,
  { params }: { params: { tableName: string; id: string } }
) {
  try {
    const { tableName, id } = params;
    
    const model = getModelByName(tableName);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tableName}` },
        { status: 404 }
      );
    }

    const record = await model.findUnique({
      where: { id }
    });
    
    if (!record) {
      return NextResponse.json(
        { error: `Record not found with id: ${id}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(record);
  } catch (error: any) {
    console.error(`Error fetching record from ${params.tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { tableName: string; id: string } }
) {
  try {
    const { tableName, id } = params;
    const data = await request.json();
    
    const model = getModelByName(tableName);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tableName}` },
        { status: 404 }
      );
    }
    
    const record = await model.update({
      where: { id },
      data
    });
    
    return NextResponse.json(record);
  } catch (error: any) {
    console.error(`Error updating record in ${params.tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { tableName: string; id: string } }
) {
  try {
    const { tableName, id } = params;
    
    const model = getModelByName(tableName);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tableName}` },
        { status: 404 }
      );
    }
    
    await model.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error deleting record from ${params.tableName}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}