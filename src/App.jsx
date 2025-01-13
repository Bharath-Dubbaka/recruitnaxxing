import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

function App() {
   const [jobDescription, setJobDescription] = useState("");
   const [analysisResult, setAnalysisResult] = useState(null);
   const [loading, setLoading] = useState(false);
   const [isDark, setIsDark] = useState(true);

   useEffect(() => {
      // Check system preference
      if (window.matchMedia("(prefers-color-scheme: light)").matches) {
         setIsDark(false);
         document.documentElement.classList.remove("dark");
      }

      // Check if there's a job description from context menu
      chrome.storage.local.get(["selectedJobDescription"], (result) => {
         if (result.selectedJobDescription) {
            setJobDescription(result.selectedJobDescription);
            chrome.storage.local.remove(["selectedJobDescription"]);
         }
      });
   }, []);

   const toggleTheme = () => {
      setIsDark(!isDark);
      document.documentElement.classList.toggle("dark");
   };

   const analyzeJobDescription = async () => {
      if (!jobDescription.trim()) return;

      setLoading(true);
      try {
         console.log("Starting job description analysis...");
         const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
         const API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

         // Updated prompt to emphasize boolean string and screening questions
         const prompt = `Analyze this job description as an expert technical recruiter and ATS specialist. 
Return ONLY a raw JSON object without any markdown formatting. The JSON structure should be:

{
  "keySkills": [
    { "skill": "string", "importance": "required|preferred", "context": "string" }
  ],
  "booleanString": "Create a detailed boolean search string with AND, OR, NOT operators",
  "redFlags": ["string"],
  "suggestedCriteria": {
    "mustHave": ["string"],
    "niceToHave": ["string"]
  }
}

For the boolean string, create a comprehensive search string suitable for LinkedIn and job boards.

Job Description:
${jobDescription}

Remember: Return ONLY the JSON object with no markdown formatting.`;

         console.log("Sending request to Gemini API...");
         const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: "POST",
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify({
               contents: [
                  {
                     parts: [{ text: prompt }],
                  },
               ],
            }),
         });

         if (!response.ok) {
            throw new Error("Failed to analyze job description");
         }

         const data = await response.json();
         console.log("Raw API Response:", data);

         const analysisText = data.candidates[0].content.parts[0].text;
         console.log("Analysis Text:", analysisText);

         // Clean the response text before parsing
         const cleanedText = analysisText
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

         console.log("Cleaned Text:", cleanedText);

         try {
            const parsedAnalysis = JSON.parse(cleanedText);
            console.log("Parsed Analysis:", parsedAnalysis);

            // Ensure required properties exist
            const validatedAnalysis = {
               ...parsedAnalysis,
               booleanString:
                  parsedAnalysis.booleanString || "No boolean string generated",
            };

            console.log("Validated Analysis:", validatedAnalysis);
            setAnalysisResult(validatedAnalysis);
         } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.log("Raw Text that failed parsing:", analysisText);
            throw new Error("Failed to parse analysis result");
         }
      } catch (error) {
         console.error("Analysis error:", error);
         // Add user-friendly error handling here
      }
      setLoading(false);
   };

   return (
      <div className="w-[400px] max-h-[600px] overflow-y-auto bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-200">
         <div className="sticky top-0 z-10 bg-light-primary dark:bg-dark-primary p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
               <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                  RecruitMaxxing
               </h1>
               <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-light-secondary dark:bg-dark-secondary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
               >
                  {isDark ? (
                     <Sun className="w-5 h-5 text-yellow-500" />
                  ) : (
                     <Moon className="w-5 h-5 text-blue-500" />
                  )}
               </button>
            </div>
         </div>

         <div className="p-4 space-y-4">
            <div className="relative">
               <textarea
                  className="w-full h-28 p-3 bg-light-secondary dark:bg-dark-secondary text-light-text dark:text-dark-text rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none resize-none text-sm"
                  placeholder="Paste job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
               />
               <div className="absolute bottom-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                  {jobDescription.length} characters
               </div>
            </div>

            <button
               className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
               onClick={analyzeJobDescription}
               disabled={loading}
            >
               {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     <span>Analyzing...</span>
                  </div>
               ) : (
                  "Analyze Job Description"
               )}
            </button>

            {analysisResult && (
               <div className="space-y-4">
                  {/* Key Skills Section */}
                  <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
                     <h2 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3">
                        Required Skills
                     </h2>
                     <div className="flex flex-wrap gap-2">
                        {analysisResult.keySkills.map((skill, index) => (
                           <span
                              key={index}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                 skill.importance === "required"
                                    ? "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20"
                                    : "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20"
                              } transition-all duration-200 hover:scale-105`}
                           >
                              {skill.skill}
                           </span>
                        ))}
                     </div>
                  </div>

                  {/* Boolean Search String */}
                  <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
                     <h2 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3">
                        Boolean Search String
                     </h2>
                     <div className="relative group">
                        <pre className="text-xs font-mono bg-light-primary dark:bg-dark-primary p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
                           {analysisResult.booleanString ||
                              "No boolean string generated"}
                        </pre>
                        <button
                           onClick={() => {
                              navigator.clipboard.writeText(
                                 analysisResult.booleanString
                              );
                           }}
                           className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-all duration-200"
                        >
                           Copy
                        </button>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

export default App;
