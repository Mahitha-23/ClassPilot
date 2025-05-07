// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface Lesson {
  title: string;
  description: string;
  outcomes: string[];
  keyConcepts: string[];
  activities: string[];
}

interface Module {
  moduleName: string;
  lesson: Lesson;
  difficulty: string;
  prerequisites: string;
  time: string;
}

export default function Home() {
  const [topic, setTopic] = useState('');
  const [moduleGenerationTopic, setModuleGenerationTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingModuleContent, setIsGeneratingModuleContent] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [moduleName, setModuleName] = useState('');
  const [modules, setModules] = useState<Module[]>([]);

  const [difficulty, setDifficulty] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [time, setTime] = useState('');
  const [editorContent, setEditorContent] = useState('');

  const editor = useEditor({
    extensions: [StarterKit],
    content: editorContent,
    onUpdate({ editor }) {
      setEditorContent(editor.getHTML());
    },
  });

  const generateLesson = async () => {
    if (!topic.trim()) return;
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      if (data.title) {
        setLesson(data);
        setEditorContent(data.description || '');
        editor?.commands.setContent(data.description || '');
        
        // Also get module suggestions
        generateModuleSuggestion();
      } else {
        setLesson(null);
      }
    } catch (error) {
      console.error('Error generating lesson:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateModuleSuggestion = async () => {
    try {
      const res = await fetch('/api/module-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();
      if (data.moduleName) {
        setModuleName(data.moduleName);
        setDifficulty(data.difficulty);
        setPrerequisites(data.prerequisites);
        setTime(data.time);
      }
    } catch (error) {
      console.error('Error generating module suggestion:', error);
    }
  };

  // Enhanced function to generate content based on module name
  const generateModuleContent = async () => {
    if (!moduleName.trim()) return;
    
    setIsGeneratingModuleContent(true);
    setModuleGenerationTopic(moduleName);
    
    try {
      const res = await fetch('/api/module-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleName }),
      });

      const data = await res.json();
      if (data.title) {
        setLesson(data);
        setEditorContent(data.description || '');
        editor?.commands.setContent(data.description || '');
        
        // If no difficulty is set yet, use the generated one
        if (!difficulty) {
          setDifficulty(data.difficulty || 'Beginner');
        }
        
        // If no prerequisites are set yet, use the generated ones
        if (!prerequisites) {
          setPrerequisites(data.prerequisites || '');
        }
        
        // If no time is set yet, use the generated one
        if (!time) {
          setTime(data.estimatedTime || '30 minutes');
        }
      }
    } catch (error) {
      console.error('Error generating module content:', error);
    } finally {
      setIsGeneratingModuleContent(false);
    }
  };

  // Handle module name change with debounce
  const handleModuleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newModuleName = e.target.value;
    setModuleName(newModuleName);
    
    // If module name is at least 3 characters, generate content after a short delay
    if (newModuleName.length >= 3) {
      // Set a timeout to avoid generating content on every keystroke
      clearTimeout(window.moduleNameTimeout);
      window.moduleNameTimeout = setTimeout(() => {
        if (newModuleName !== moduleGenerationTopic && !isGeneratingModuleContent) {
          generateModuleContent();
        }
      }, 1000); // 1 second delay
    }
  };

  const saveModule = async () => {
    if (!lesson || !moduleName) return;

    const updatedLesson = { ...lesson, description: editorContent };

    try {
      await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleName,
          lesson: updatedLesson,
          difficulty,
          prerequisites,
          time,
        }),
      });

      // Clear inputs
      setModuleName('');
      setDifficulty('');
      setPrerequisites('');
      setTime('');
      setLesson(null);
      setEditorContent('');
      editor?.commands.setContent('');
      setModuleGenerationTopic('');
      
      fetchModules();
    } catch (error) {
      console.error('Error saving module:', error);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await fetch('/api/modules');
      const data = await res.json();
      setModules(data);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  useEffect(() => {
    fetchModules();
    
    // Clean up any pending timeouts
    return () => {
      clearTimeout(window.moduleNameTimeout);
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 text-black flex justify-center px-4 py-8 font-sans">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold mb-4 text-blue-700">ClassPilot</h1>
        <p className="text-gray-600 mb-6">AI-powered course authoring platform. Enter a topic to generate educational content.</p>
        
        <div className="flex mb-6">
          <input
            type="text"
            placeholder="Enter topic (e.g., Photosynthesis, Machine Learning, World War II)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={generateLesson}
            disabled={isGenerating}
            className={`px-6 py-3 font-medium text-white rounded-r transition ${
              isGenerating ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Lesson"
            )}
          </button>
        </div>

        {/* Lesson content section */}
        {lesson && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm mb-6">
            <h2 className="text-2xl font-semibold mb-4">{lesson.title}</h2>

            <label className="block font-semibold mb-2">📝 Description:</label>
            <div className="border border-gray-300 p-3 mb-6 bg-white rounded min-h-32">
              <EditorContent editor={editor} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">🎯 Learning Outcomes</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {lesson.outcomes?.map((o, i) => (
                    <li key={i} className="text-gray-700">{o}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">🔑 Key Concepts</h3>
                <ul className="list-disc pl-6 space-y-1">
                  {lesson.keyConcepts?.map((k, i) => (
                    <li key={i} className="text-gray-700">{k}</li>
                  ))}
                </ul>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">🧩 Activities</h3>
            <ul className="list-disc pl-6 space-y-1 mb-6">
              {lesson.activities?.map((a, i) => (
                <li key={i} className="text-gray-700">{a}</li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold mb-4">Module Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Module name (auto-generates content)"
                  value={moduleName}
                  onChange={handleModuleNameChange}
                  className="p-3 w-full border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {isGeneratingModuleContent && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select Difficulty</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <input
                type="text"
                placeholder="Prerequisites (comma-separated)"
                value={prerequisites}
                onChange={(e) => setPrerequisites(e.target.value)}
                className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Estimated Time (e.g., 30 mins)"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            
            <button
              onClick={saveModule}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-3 rounded transition w-full"
            >
              Save to Module
            </button>
          </div>
        )}

        {/* Saved modules section */}
        {modules.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">📦 Saved Modules</h2>
            <div className="space-y-4">
              {modules.map((mod, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold">{mod.moduleName}</h3>
                    <div className="flex space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {mod.difficulty}
                      </span>
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        {mod.time}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    <strong>Prerequisites:</strong> {mod.prerequisites}
                  </p>

                  <h4 className="text-lg font-bold mb-2">{mod.lesson.title}</h4>
                  <div 
                    dangerouslySetInnerHTML={{ __html: mod.lesson.description }} 
                    className="mb-4 text-gray-800 prose max-w-none" 
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-semibold mb-1">🎯 Learning Outcomes</h5>
                      <ul className="list-disc pl-6 text-sm text-gray-700">
                        {mod.lesson.outcomes?.map((o, j) => <li key={j}>{o}</li>)}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-semibold mb-1">🔑 Key Concepts</h5>
                      <ul className="list-disc pl-6 text-sm text-gray-700">
                        {mod.lesson.keyConcepts?.map((k, j) => <li key={j}>{k}</li>)}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h5 className="font-semibold mb-1">🧩 Activities</h5>
                    <ul className="list-disc pl-6 text-sm text-gray-700">
                      {mod.lesson.activities?.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Add the timeout property to the Window interface
declare global {
  interface Window {
    moduleNameTimeout: number;
  }
}