// src/app/api/modules/route.ts
import { NextResponse } from 'next/server';

// In-memory storage for modules (replace with a database for production)
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
  const body = await req.json();
  const { moduleName, lesson, difficulty, prerequisites, time } = body;
  
  const moduleData = {
    moduleName,
    lesson,
    difficulty,
    prerequisites,
    time
  };
  
  modules.push(moduleData);
  return NextResponse.json({ status: 'ok' });
}