// src/app/api/module-lesson/route.ts
import { NextResponse } from 'next/server';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || '',
});

interface LessonResponse {
  title: string;
  description: string;
  outcomes: string[];
  keyConcepts: string[];
  activities: string[];
  difficulty?: string;
  prerequisites?: string;
  estimatedTime?: string;
}

export async function POST(req: Request) {
  try {
    const { moduleName } = await req.json();
    
    // Use Replicate to run LLaMA
    const output = await replicate.run(
      "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
      {
        input: {
          prompt: `Based on the module title "${moduleName}", create an appropriate educational lesson that would fit in this module. Format your response with the following sections:

Title: A specific lesson title that fits within the "${moduleName}" module
Description: A thorough introduction to the topic (2-3 paragraphs)
Learning Outcomes: List 4-5 specific learning outcomes, each starting with a verb
Key Concepts: List 5-7 key concepts that students should master
Activities: List 3-5 engaging learning activities
Difficulty: Specify one level - Beginner, Intermediate, or Advanced
Prerequisites: List any prerequisite knowledge or skills separated by commas
Estimated Time: How long this lesson would take to complete (e.g., 30 minutes, 1 hour)

Make sure to format each section with clear headings and ensure the content is directly relevant to the module title.`,
          max_new_tokens: 2000,
          temperature: 0.7,
          system_prompt: "You are an expert educational content creator specializing in creating structured, engaging lessons that fit within larger educational modules."
        }
      }
    );
    
    // Join the output array into a single string
    const response = Array.isArray(output) ? output.join('') : String(output);
    
    // Parse the AI response into structured lesson data
    const lesson: LessonResponse = {
      title: extractTitle(response) || `Lesson for ${moduleName}`,
      description: extractDescription(response) || `This lesson covers key topics within ${moduleName}.`,
      outcomes: extractListItems(response, "outcomes") || [
        `Understand the core concepts of ${moduleName}`,
        `Apply knowledge of ${moduleName} in practical situations`,
        `Analyze the importance of ${moduleName} in broader contexts`
      ],
      keyConcepts: extractListItems(response, "concepts") || [
        `Definition of key terms in ${moduleName}`,
        `Historical development of ${moduleName}`,
        `Practical applications of ${moduleName}`
      ],
      activities: extractListItems(response, "activities") || [
        `Research project on ${moduleName}`,
        `Group discussion about ${moduleName}`,
        `Practical demonstration of ${moduleName} concepts`
      ],
      difficulty: extractValue(response, "difficulty") || "Beginner",
      prerequisites: extractValue(response, "prerequisites") || "",
      estimatedTime: extractValue(response, "time", "estimated time") || "30 minutes"
    };
    
    return NextResponse.json(lesson);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'Failed to generate lesson from module name' }, { status: 500 });
  }
}

// Helper functions to parse AI response
function extractTitle(text: string): string | null {
  const titleMatch = text.match(/Title:?\s*([^\n]+)/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractDescription(text: string): string | null {
  const descMatch = text.match(/Description:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i);
  return descMatch ? descMatch[1].trim() : null;
}

function extractListItems(text: string, type: "outcomes" | "concepts" | "activities"): string[] | null {
  const patterns: Record<string, RegExp> = {
    outcomes: /Learning Outcomes:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i,
    concepts: /Key Concepts:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i,
    activities: /Activities:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z]|$)/i
  };
  
  const sectionMatch = text.match(patterns[type]);
  if (!sectionMatch) return null;
  
  // Extract list items, assuming they start with number, dash, or asterisk
  const listItems = sectionMatch[1].split('\n')
    .map(line => line.replace(/^[\d\-\*\.\s]+/, '').trim())
    .filter(line => line.length > 0);
  
  return listItems.length > 0 ? listItems : null;
}

function extractValue(text: string, ...keywords: string[]): string | null {
  // Search for any of the provided keywords
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}:?\\s*([^\\n]+)`, 'i');
    const match = text.match(regex);
    if (match) return match[1].trim();
  }
  return null;
}