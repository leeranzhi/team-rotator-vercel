import { NextResponse } from 'next/server';
import { getMembers, updateMember } from '@/lib/db';
import { Member } from '@/types';

export async function GET() {
  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const member: Member = await request.json();
    await updateMember(member);
    return NextResponse.json(member);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
} 