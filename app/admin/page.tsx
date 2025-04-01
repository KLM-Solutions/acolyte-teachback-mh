'use client';
import { useState, useEffect } from 'react';
import { useSystemPrompt } from '../context/SystemPromptContext';
import Link from 'next/link';
import { Loader, MessageCircle } from 'lucide-react';

export default function AdminPage() {
  const { 
    systemPrompt, 
    heading, 
    description, 
    pageTitle, 
    aboutExercise, 
    taskDescription,
    setSystemPrompt, 
    setHeading, 
    setDescription, 
    setPageTitle, 
    setAboutExercise, 
    setTaskDescription,
    isLoading 
  } = useSystemPrompt();
  
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localHeading, setLocalHeading] = useState(heading);
  const [localDescription, setLocalDescription] = useState(description);
  const [localPageTitle, setLocalPageTitle] = useState(pageTitle);
  const [localAboutExercise, setLocalAboutExercise] = useState(aboutExercise);
  const [localTaskDescription, setLocalTaskDescription] = useState(taskDescription);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalPrompt(systemPrompt);
    setLocalHeading(heading);
    setLocalDescription(description);
    setLocalPageTitle(pageTitle);
    setLocalAboutExercise(aboutExercise);
    setLocalTaskDescription(taskDescription);
  }, [systemPrompt, heading, description, pageTitle, aboutExercise, taskDescription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await Promise.all([
        setSystemPrompt(localPrompt),
        setHeading(localHeading),
        setDescription(localDescription),
        setPageTitle(localPageTitle),
        setAboutExercise(localAboutExercise),
        setTaskDescription(localTaskDescription)
      ]);
      alert('Settings updated successfully!');
    } catch (error) {
      alert('Failed to update settings');
      console.error('Update error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
            <div className="flex space-x-4">
              <Link 
                href="/chat"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Go to Chat
              </Link>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Page Title Input */}
            <div>
              <label 
                htmlFor="pageTitle" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Page Title
              </label>
              <input
                id="pageTitle"
                type="text"
                value={localPageTitle}
                onChange={(e) => setLocalPageTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the page title..."
              />
            </div>

            {/* Heading Input */}
            <div>
              <label 
                htmlFor="heading" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Welcome Heading
              </label>
              <input
                id="heading"
                type="text"
                value={localHeading}
                onChange={(e) => setLocalHeading(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the welcome heading..."
              />
            </div>

            {/* Description Input */}
            <div>
              <label 
                htmlFor="description" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Welcome Description
              </label>
              <textarea
                id="description"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the welcome description..."
              />
            </div>

            {/* About Exercise Input */}
            <div>
              <label 
                htmlFor="aboutExercise" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                About This Exercise
              </label>
              <textarea
                id="aboutExercise"
                value={localAboutExercise}
                onChange={(e) => setLocalAboutExercise(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the about exercise content..."
              />
            </div>

            {/* Task Description Input */}
            <div>
              <label 
                htmlFor="taskDescription" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Task
              </label>
              <textarea
                id="taskDescription"
                value={localTaskDescription}
                onChange={(e) => setLocalTaskDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the task description..."
              />
            </div>

            {/* System Prompt Input */}
            <div>
              <label 
                htmlFor="systemPrompt" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                System Prompt
              </label>
              <textarea
                id="systemPrompt"
                value={localPrompt}
                onChange={(e) => setLocalPrompt(e.target.value)}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter the system prompt here..."
              />
            </div>
            
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
