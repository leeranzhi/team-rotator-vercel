import { NextResponse } from 'next/server';
import { getTasks, saveTask } from '@/lib/db';
import { Task } from '@/types';

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const task: Task = await request.json();
    const savedTask = await saveTask(task);
    return NextResponse.json(savedTask);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
} 