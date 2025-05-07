import { NextResponse } from 'next/server';

// In-memory storage for modules (use a DB in production)
const modules: {
  moduleName: string;
  lesson: {
    title: string;
    description: string;
    outcomes: string[];
    keyConcepts: string[];
    activities: string[];
  };
  difficulty: string;
  prerequisites: string;
  time: string;
}[] = [];

export async function GET() {
  return NextResponse.json(modules);
}

export async function POST(req: Request) {
  const body: {
    moduleName: string;
    lesson: {
      title: string;
      description: string;
      outcomes: string[];
      keyConcepts: string[];
      activities: string[];
    };
    difficulty: string;
    prerequisites: string;
    time: string;
  } = await req.json();

  modules.push(body);

  return NextResponse.json({ status: 'ok' });
}
