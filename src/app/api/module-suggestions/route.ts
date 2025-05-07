// src/app/api/module-suggestions/route.ts
import { NextResponse } from 'next/server';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    
    const output = await replicate.run(
      "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
      {
        input: {
          prompt: `For an educational lesson about "${topic}", suggest appropriate module metadata with the following format:

Module Name: A descriptive name for the larger module this lesson would fit into
Difficulty: Specify one of these levels - Beginner, Intermediate, or Advanced
Prerequisites: List any prerequisite knowledge or skills separated by commas
Estimated Time: How long this lesson would take to complete (e.g., 30 minutes, 1 hour)

Keep your response brief and structured exactly as requested.`,
          max_new_tokens: 500,
          temperature: 0.7,
          system_prompt: "You are an expert curriculum designer who creates metadata for educational modules."
        }
      }
    );
    
    // Join the output array into a single string
    const response = Array.isArray(output) ? output.join('') : output.toString();
    
    // Parse the response to extract metadata
    const moduleName = extractValue(response, "module name", "name") || `${topic} Fundamentals`;
    const difficulty = extractValue(response, "difficulty") || "Beginner";
    const prerequisites = extractValue(response, "prerequisites") || "None";
    const time = extractValue(response, "time", "estimated time") || "30 minutes";
    
    return NextResponse.json({
      moduleName,
      difficulty,
      prerequisites,
      time
    });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'Failed to generate module suggestions' }, { status: 500 });
  }
}

function extractValue(text, ...keywords) {
  // Search for any of the provided keywords
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}:?\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}