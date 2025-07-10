import { NextResponse } from 'next/server';
import { getTaskAssignmentsWithDetails, updateTaskAssignment } from '@/lib/db';
import { TaskAssignment } from '@/types';

export async function GET() {
  try {
    const assignments = await getTaskAssignmentsWithDetails();
    return NextResponse.json(assignments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const assignment: TaskAssignment = await request.json();
    await updateTaskAssignment(assignment);
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const assignment: TaskAssignment = await request.json();
    await updateTaskAssignment(assignment);
    return NextResponse.json(assignment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
} 