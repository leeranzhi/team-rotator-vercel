import { NextResponse } from 'next/server';
import { getMembers, saveMember } from '@/lib/db';
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
    const savedMember = await saveMember(member);
    return NextResponse.json(savedMember);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
} 