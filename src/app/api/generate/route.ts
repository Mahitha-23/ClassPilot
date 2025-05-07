// src/app/api/generate/route.ts
import { NextResponse } from 'next/server';
import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(req: Request) {
  try {
    const { topic } = await req.json();
    
    // Use Replicate to run LLaMA
    const output = await replicate.run(
      "meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3",
      {
        input: {
          prompt: `Create a comprehensive educational lesson about "${topic}". Format your response with the following sections:

Title: A clear, compelling title for the lesson
Description: A thorough introduction to the topic (2-3 paragraphs)
Learning Outcomes: List 4-5 specific learning outcomes, each starting with a verb
Key Concepts: List 5-7 key concepts that students should master
Activities: List 3-5 engaging learning activities

Make sure to format each section with clear headings.`,
          max_new_tokens: 2000,
          temperature: 0.7,
          system_prompt: "You are an expert educational content creator specializing in creating structured, engaging lessons."
        }
      }
    );
    
    // Join the output array into a single string
    const response = Array.isArray(output) ? output.join('') : output.toString();
    
    // Parse the AI response into structured lesson data
    const lesson = {
      title: extractTitle(response) || `Understanding ${topic}`,
      description: extractDescription(response) || `Learn about ${topic} and its applications.`,
      outcomes: extractListItems(response, "outcomes") || [
        `Understand the basics of ${topic}`,
        `Explain the importance of ${topic} in context`,
        `Apply knowledge of ${topic} in practical situations`
      ],
      keyConcepts: extractListItems(response, "concepts") || [
        `Definition of ${topic}`,
        `History and development of ${topic}`,
        `Applications and significance`
      ],
      activities: extractListItems(response, "activities") || [
        `Research project on ${topic}`,
        `Group discussion about ${topic}`,
        `Practical demonstration of ${topic}`
      ]
    };
    
    return NextResponse.json(lesson);
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'Failed to generate lesson' }, { status: 500 });
  }
}

// Helper functions to parse AI response
function extractTitle(text) {
  const titleMatch = text.match(/Title:?\s*([^\n]+)/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

function extractDescription(text) {
  const descMatch = text.match(/Description:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i);
  return descMatch ? descMatch[1].trim() : null;
}

function extractListItems(text, type) {
  const patterns = {
    outcomes: /Learning Outcomes:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i,
    concepts: /Key Concepts:?(?:\s*)([\s\S]+?)(?:\n\n|\n[A-Z])/i,
    activities: /Activities:?(?:\s*)([\s\S]+?)(?:\n\n|$)/i
  };
  
  const sectionMatch = text.match(patterns[type]);
  if (!sectionMatch) return null;
  
  // Extract list items, assuming they start with number, dash, or asterisk
  const listItems = sectionMatch[1].split('\n')
    .map(line => line.replace(/^[\d\-\*\.\s]+/, '').trim())
    .filter(line => line.length > 0);
  
  return listItems.length > 0 ? listItems : null;
}