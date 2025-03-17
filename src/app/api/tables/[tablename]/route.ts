import { NextResponse } from 'next/server';
import { getModelByName } from '@/app/lib/model-utils';

export async function GET(
  request: Request,
  { params }: { params: { tablename: string; id: string } }
) {
  try {
    const { tablename, id } = params;
    const model = getModelByName(tablename);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tablename}` },
        { status: 404 }
      );
    }

    // Use findUnique to get a record by ID
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
    console.error(`Error fetching record from ${params.tablename}:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { tablename: string; id: string } }
) {
  try {
    const { tablename, id } = params;
    const data = await request.json();
    const model = getModelByName(tablename);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tablename}` },
        { status: 404 }
      );
    }
    
    // Use update to modify a specific record
    const record = await model.update({
      where: { id },
      data
    });
    
    return NextResponse.json(record);
  } catch (error: any) {
    console.error(`Error updating record in ${params.tablename}:`, error);
    
    // Handle common errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: `Record with ID ${params.id} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { tablename: string; id: string } }
) {
  try {
    const { tablename, id } = params;
    const model = getModelByName(tablename);
    
    if (!model) {
      return NextResponse.json(
        { error: `Table not found: ${tablename}` },
        { status: 404 }
      );
    }
    
    // Use delete to remove a record
    const record = await model.delete({
      where: { id }
    });
    
    return NextResponse.json(record);
  } catch (error: any) {
    console.error(`Error deleting record from ${params.tablename}:`, error);
    
    // Handle common errors
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: `Record with ID ${params.id} not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}