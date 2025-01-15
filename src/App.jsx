import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

function App() {
   const [jobDescription, setJobDescription] = useState(() => {
      return localStorage.getItem("lastJobDescription") || "";
   });

   const [analysisResult, setAnalysisResult] = useState(() => {
      const savedResult = localStorage.getItem("lastAnalysisResult");
      return savedResult ? JSON.parse(savedResult) : null;
   });

   const [loading, setLoading] = useState(false);
   const [isDark, setIsDark] = useState(true);
   const [hoveredSkill, setHoveredSkill] = useState(null);

   useEffect(() => {
      localStorage.setItem("lastJobDescription", jobDescription);
   }, [jobDescription]);

   useEffect(() => {
      if (analysisResult) {
         localStorage.setItem(
            "lastAnalysisResult",
            JSON.stringify(analysisResult)
         );
      }
   }, [analysisResult]);

   const handleClear = () => {
      setJobDescription("");
      setAnalysisResult(null);
      localStorage.removeItem("lastJobDescription");
      localStorage.removeItem("lastAnalysisResult");
   };

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
         const prompt = `As an expert technical recruiter and Boolean search specialist, analyze this job description and create detailed Boolean search strings with explanations.

Return ONLY a raw JSON object with this structure:

{
  "keySkills": [
    {
      "skill": "string",
      "importance": "required|preferred",
      "alternatives": ["array of alternative terms", "abbreviations", "related skills"],
      "context": "Why this skill matters for the role, explain it in-detail like iam 5 years old in laymen terms"
    }
  ],
  "booleanSearches": {
    "broad": {
      "string": "Boolean string here",
      "explanation": "General strategy explanation",
      "construction": {
        "titleVariations": ["List of job title variations used"],
        "coreTechnologies": ["Core tech terms used"],
        "groupingLogic": [
          {
            "group": "The grouped terms",
            "reason": "Why these terms were grouped together",
            "expectedImpact": "What this grouping achieves"
          }
        ]
      }
    },
    "mid": {
      "string": "Boolean string here",
      "explanation": "Strategy explanation",
      "construction": {/* same structure as broad */}
    },
    "narrow": {
      "string": "Boolean string here",
      "explanation": "Strategy explanation",
      "construction": {/* same structure as broad */}
    }
  },
}

Guidelines for Boolean string construction:
1. Explain each major grouping of terms, Detail why specific operators were chosen
2. Detail the progression from broad to narrow, for broad search try to breakdown long tail keywords/multiple words keywords if we can.
3. Show alternatives considered, Include common variations and abbreviations
4. Use parentheses to group related terms but not more than one level of grouping
5. Use quotes for exact phrases and keyword with 2 or more words in it(e.g. "data engineer")
6. Include common variations and synonyms for job titles and technologies.
7. Account for different levels of seniority (eg:manager, director, etc), but do not include years of experience in the search string
8. Include relevant certifications or domain-specific keywords.

Job Description:
${jobDescription}

Remember: Return ONLY the JSON object with no markdown formatting.`;

         console.log("Sending request to Gemini API...");
         const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
         const API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

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

            // Ensure required properties exist with default values
            const validatedAnalysis = {
               keySkills: parsedAnalysis.keySkills || [],
               booleanSearches: {
                  broad: {
                     string:
                        parsedAnalysis.booleanSearches?.broad?.string ||
                        "No broad search generated",
                     explanation:
                        parsedAnalysis.booleanSearches?.broad?.explanation ||
                        "",
                     construction: {
                        titleVariations:
                           parsedAnalysis.booleanSearches?.broad?.construction
                              ?.titleVariations || [],
                        coreTechnologies:
                           parsedAnalysis.booleanSearches?.broad?.construction
                              ?.coreTechnologies || [],
                        groupingLogic:
                           parsedAnalysis.booleanSearches?.broad?.construction
                              ?.groupingLogic || [],
                     },
                  },
                  mid: {
                     string:
                        parsedAnalysis.booleanSearches?.mid?.string ||
                        "No mid search generated",
                     explanation:
                        parsedAnalysis.booleanSearches?.mid?.explanation || "",
                     construction: {
                        titleVariations:
                           parsedAnalysis.booleanSearches?.mid?.construction
                              ?.titleVariations || [],
                        coreTechnologies:
                           parsedAnalysis.booleanSearches?.mid?.construction
                              ?.coreTechnologies || [],
                        groupingLogic:
                           parsedAnalysis.booleanSearches?.mid?.construction
                              ?.groupingLogic || [],
                     },
                  },
                  narrow: {
                     string:
                        parsedAnalysis.booleanSearches?.narrow?.string ||
                        "No narrow search generated",
                     explanation:
                        parsedAnalysis.booleanSearches?.narrow?.explanation ||
                        "",
                     construction: {
                        titleVariations:
                           parsedAnalysis.booleanSearches?.narrow?.construction
                              ?.titleVariations || [],
                        coreTechnologies:
                           parsedAnalysis.booleanSearches?.narrow?.construction
                              ?.coreTechnologies || [],
                        groupingLogic:
                           parsedAnalysis.booleanSearches?.narrow?.construction
                              ?.groupingLogic || [],
                     },
                  },
               },
            };

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
      <div className="w-[800px] max-h-full overflow-y-auto bg-light-primary dark:bg-dark-primary text-light-text dark:text-dark-text transition-colors duration-200">
         <div className="sticky top-0 z-10 bg-light-primary dark:bg-dark-primary p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-2 bg-light-secondary dark:bg-dark-secondary rounded-lg border border-gray-200 dark:border-gray-700">
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
                  className="w-full h-40 p-3 bg-light-secondary dark:bg-dark-secondary text-light-text dark:text-dark-text rounded-lg border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 outline-none resize-none text-sm"
                  placeholder="Paste job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
               />
               <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{jobDescription.length} characters</span>
                  {jobDescription && (
                     <button
                        onClick={handleClear}
                        className="px-2 py-1 text-xs bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition-colors duration-200"
                     >
                        Clear
                     </button>
                  )}
               </div>
            </div>

            <button
               className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
               onClick={analyzeJobDescription}
               disabled={loading || !jobDescription.trim()}
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
                  {/* Key Skills Section with Alternatives */}
                  <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
                     <h2 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3">
                        Skills Analysis
                     </h2>
                     <div className="flex flex-wrap gap-2">
                        {analysisResult.keySkills.map((skill, index) => (
                           <div key={index} className="relative">
                              <span
                                 onMouseEnter={() => setHoveredSkill(index)}
                                 onMouseLeave={() => setHoveredSkill(null)}
                                 className={`px-2 py-1 rounded-full text-xs font-medium cursor-help
                  ${
                     skill.importance === "required"
                        ? "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20"
                        : "bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20"
                  }`}
                              >
                                 {skill.skill}
                              </span>

                              {/* Hover Card */}
                              {hoveredSkill === index && (
                                 <div className="absolute z-50 w-64 p-3 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs space-y-2">
                                       <div>
                                          <span className="font-medium text-gray-700 dark:text-gray-300">
                                             Context:{" "}
                                          </span>
                                          <span className="text-gray-600 dark:text-gray-400">
                                             {skill.context}
                                          </span>
                                       </div>
                                       {skill.alternatives?.length > 0 && (
                                          <div>
                                             <span className="font-medium text-gray-700 dark:text-gray-300">
                                                Alternatives:{" "}
                                             </span>
                                             <div className="flex flex-wrap gap-1 mt-1">
                                                {skill.alternatives.map(
                                                   (alt, i) => (
                                                      <span
                                                         key={i}
                                                         className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400"
                                                      >
                                                         {alt}
                                                      </span>
                                                   )
                                                )}
                                             </div>
                                          </div>
                                       )}
                                       <div>
                                          <span className="font-medium text-gray-700 dark:text-gray-300">
                                             Importance:{" "}
                                          </span>
                                          <span
                                             className={`${
                                                skill.importance === "required"
                                                   ? "text-red-500 dark:text-red-400"
                                                   : "text-blue-500 dark:text-blue-400"
                                             }`}
                                          >
                                             {skill.importance}
                                          </span>
                                       </div>
                                    </div>
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Boolean Search Strings with Construction Details */}
                  <div className="bg-light-secondary dark:bg-dark-secondary rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-lg">
                     <h2 className="text-sm font-semibold text-light-text dark:text-dark-text mb-3">
                        Boolean Search Construction
                     </h2>

                     {/* Broad Search with Details */}
                     <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="text-xs font-medium text-blue-500">
                              Broad Search
                           </h3>
                           <button
                              onClick={() =>
                                 navigator.clipboard.writeText(
                                    analysisResult.booleanSearches.broad.string
                                 )
                              }
                              className="px-2 py-1 text-xs bg-blue-500/10 text-blue-500 rounded-full hover:bg-blue-500/20"
                           >
                              Copy
                           </button>
                        </div>
                        <pre className="text-xs font-mono bg-light-primary dark:bg-dark-primary p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
                           {analysisResult.booleanSearches.broad.string}
                        </pre>

                        {/* Construction Details */}
                        <div className="mt-2 space-y-2">
                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Title Variations
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                 {analysisResult.booleanSearches.broad.construction.titleVariations.map(
                                    (title, i) => (
                                       <span
                                          key={i}
                                          className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                                       >
                                          {title}
                                       </span>
                                    )
                                 )}
                              </div>
                           </div>

                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Grouping Logic
                              </h4>
                              {analysisResult.booleanSearches.broad.construction.groupingLogic.map(
                                 (group, i) => (
                                    <div key={i} className="ml-2 mt-1">
                                       <div className="font-mono text-gray-600 dark:text-gray-400">
                                          {group.group}
                                       </div>
                                       <div className="text-gray-500 italic mt-0.5">
                                          {group.reason}
                                       </div>
                                    </div>
                                 )
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Mid Search with Details */}
                     <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="text-xs font-medium text-purple-500">
                              Mid-Level Search
                           </h3>
                           <button
                              onClick={() =>
                                 navigator.clipboard.writeText(
                                    analysisResult.booleanSearches.mid.string
                                 )
                              }
                              className="px-2 py-1 text-xs bg-purple-500/10 text-purple-500 rounded-full hover:bg-purple-500/20"
                           >
                              Copy
                           </button>
                        </div>
                        <pre className="text-xs font-mono bg-light-primary dark:bg-dark-primary p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
                           {analysisResult.booleanSearches.mid.string}
                        </pre>

                        {/* Construction Details */}
                        <div className="mt-2 space-y-2">
                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Title Variations
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                 {analysisResult.booleanSearches.mid.construction.titleVariations.map(
                                    (title, i) => (
                                       <span
                                          key={i}
                                          className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                                       >
                                          {title}
                                       </span>
                                    )
                                 )}
                              </div>
                           </div>

                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Grouping Logic
                              </h4>
                              {analysisResult.booleanSearches.mid.construction.groupingLogic.map(
                                 (group, i) => (
                                    <div key={i} className="ml-2 mt-1">
                                       <div className="font-mono text-gray-600 dark:text-gray-400">
                                          {group.group}
                                       </div>
                                       <div className="text-gray-500 italic mt-0.5">
                                          {group.reason}
                                       </div>
                                    </div>
                                 )
                              )}
                           </div>
                        </div>
                     </div>

                     {/* Narrow Search with Details */}
                     <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                           <h3 className="text-xs font-medium text-green-500">
                              Narrow Search
                           </h3>
                           <button
                              onClick={() =>
                                 navigator.clipboard.writeText(
                                    analysisResult.booleanSearches.narrow.string
                                 )
                              }
                              className="px-2 py-1 text-xs bg-green-500/10 text-green-500 rounded-full hover:bg-green-500/20"
                           >
                              Copy
                           </button>
                        </div>
                        <pre className="text-xs font-mono bg-light-primary dark:bg-dark-primary p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap break-words">
                           {analysisResult.booleanSearches.narrow.string}
                        </pre>

                        {/* Construction Details */}
                        <div className="mt-2 space-y-2">
                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Title Variations
                              </h4>
                              <div className="flex flex-wrap gap-1 mt-1">
                                 {analysisResult.booleanSearches.narrow.construction.titleVariations.map(
                                    (title, i) => (
                                       <span
                                          key={i}
                                          className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
                                       >
                                          {title}
                                       </span>
                                    )
                                 )}
                              </div>
                           </div>

                           <div className="text-xs">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                 Grouping Logic
                              </h4>
                              {analysisResult.booleanSearches.narrow.construction.groupingLogic.map(
                                 (group, i) => (
                                    <div key={i} className="ml-2 mt-1">
                                       <div className="font-mono text-gray-600 dark:text-gray-400">
                                          {group.group}
                                       </div>
                                       <div className="text-gray-500 italic mt-0.5">
                                          {group.reason}
                                       </div>
                                    </div>
                                 )
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>
      </div>
   );
}

export default App;
