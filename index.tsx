
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface Example {
  english: string;
  korean: string;
  meaning: string;
  grammar: string;
}

interface WordData {
  word: string;
  examples: Example[];
}

const App: React.FC = () => {
  const [currentWord, setCurrentWord] = useState<string>("");
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userInput, setUserInput] = useState<string>("");
  const [practiceTexts, setPracticeTexts] = useState<string[]>(new Array(10).fill(""));
  const [hiddenStates, setHiddenStates] = useState<boolean[]>(new Array(10).fill(false));
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  const defaultWords = ["Persistent", "Resilience", "Eloquent", "Meticulous", "Ambiguous", "Vibrant", "Pragmatic", "Inevitably", "Compromise", "Paradigm"];

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    handleAutoRecommend();
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("브라우저 메뉴에서 '홈 화면에 추가' 또는 '설치'를 선택해주세요!");
    }
  };

  const fetchWordDetails = async (word: string) => {
    setLoading(true);
    setPracticeTexts(new Array(10).fill(""));
    setHiddenStates(new Array(10).fill(false));

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Provide 10 high-quality example sentences for the English word "${word}". 
        For each sentence, provide the English sentence, the Korean translation, the specific nuance/meaning of "${word}" in that context, and a short grammar tip.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              examples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    english: { type: Type.STRING },
                    korean: { type: Type.STRING },
                    meaning: { type: Type.STRING },
                    grammar: { type: Type.STRING },
                  },
                  required: ["english", "korean", "meaning", "grammar"],
                },
              },
            },
            required: ["word", "examples"],
          },
        },
      });

      const data = JSON.parse(response.text) as WordData;
      setWordData(data);
      setCurrentWord(data.word);
    } catch (error) {
      console.error("Error fetching word details:", error);
      alert("데이터를 가져오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRecommend = () => {
    const randomWord = defaultWords[Math.floor(Math.random() * defaultWords.length)];
    fetchWordDetails(randomWord);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      fetchWordDetails(userInput.trim());
      setUserInput("");
    }
  };

  const toggleHidden = (index: number) => {
    const newStates = [...hiddenStates];
    newStates[index] = !newStates[index];
    setHiddenStates(newStates);
  };

  // --- 문장 비교 로직 ---
  const calculateAccuracy = (original: string, input: string) => {
    if (!input.trim()) return 0;
    
    // 특수문자 제거 및 소문자 변환
    const clean = (str: string) => str.toLowerCase().replace(/[.,!?;:]/g, "").trim();
    const s1 = clean(original);
    const s2 = clean(input);
    
    if (s1 === s2) return 100;
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    let matches = 0;
    words2.forEach(word => {
      if (words1.includes(word)) matches++;
    });
    
    const accuracy = Math.round((matches / Math.max(words1.length, words2.length)) * 100);
    return Math.min(accuracy, 100);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#4A4A4A] font-sans">
      <header className="bg-white border-b border-[#E8E4D1] p-4 sticky top-0 z-30 shadow-sm flex justify-between items-center">
        <button 
          onClick={handleInstallClick}
          className="bg-[#6B8E23] text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-green-100 animate-bounce"
        >
          앱 다운로드
        </button>
        <h1 className="text-lg font-black text-[#6B8E23] tracking-tighter">오늘의 단어장</h1>
        <button 
          onClick={() => setIsGuideOpen(true)}
          className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold"
        >
          ?
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <section className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-[#E8E4D1] mb-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#6B8E23]"></div>
          <div className="text-center">
            <span className="text-[10px] font-black text-[#A4C639] uppercase tracking-widest mb-2 block">Vocabulary of the Day</span>
            <h2 className="text-5xl font-black text-[#333] mb-8 lowercase italic">
              {loading ? "..." : currentWord || "Ready"}
            </h2>

            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="어떤 단어를 공부해볼까요?"
                className="w-full px-6 py-4 bg-[#F9F9F9] border-none rounded-2xl focus:ring-2 focus:ring-[#A4C639] transition-all text-sm placeholder:text-gray-300"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="submit" className="bg-[#6B8E23] text-white py-4 rounded-2xl font-bold hover:bg-[#556B2F] active:scale-95 transition-all shadow-md">학습 시작</button>
                <button type="button" onClick={handleAutoRecommend} className="bg-white text-[#6B8E23] border-2 border-[#6B8E23] py-4 rounded-2xl font-bold active:scale-95 transition-all">랜덤 추천</button>
              </div>
            </form>
          </div>
        </section>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-[#F0F4E1] border-t-[#6B8E23] rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-[#6B8E23]">AI가 문장을 구성하고 있습니다...</p>
          </div>
        )}

        {!loading && wordData && (
          <div className="space-y-4">
            {wordData.examples.map((item, idx) => {
              const accuracy = calculateAccuracy(item.english, practiceTexts[idx]);
              
              return (
                <div key={idx} className="bg-white rounded-[2rem] p-6 border border-[#E8E4D1] shadow-sm animate-in" style={{animationDelay: `${idx * 0.1}s`}}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 bg-[#F0F4E1] rounded-full flex items-center justify-center text-[#6B8E23] text-xs font-black">
                      {idx + 1}
                    </div>
                    <button
                      onClick={() => toggleHidden(idx)}
                      className={`text-[10px] font-black px-4 py-2 rounded-xl transition-all ${
                        hiddenStates[idx] 
                        ? "bg-[#6B8E23] text-white" 
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {hiddenStates[idx] ? "답안 보기" : "문장 가리기"}
                    </button>
                  </div>

                  <div className="mb-6">
                    {hiddenStates[idx] ? (
                      <div className="space-y-3">
                        <textarea
                          className="w-full p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-base focus:outline-none placeholder:text-gray-300"
                          placeholder="이 문장을 외워서 적어보세요..."
                          rows={2}
                          value={practiceTexts[idx]}
                          onChange={(e) => {
                            const newTexts = [...practiceTexts];
                            newTexts[idx] = e.target.value;
                            setPracticeTexts(newTexts);
                          }}
                        />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] font-black text-gray-300 uppercase block mb-1 tracking-tighter">Original Sentence</span>
                          <p className="text-xl font-medium text-[#333] leading-snug">
                            {item.english}
                          </p>
                        </div>
                        
                        {/* 문장 비교 결과 섹션 */}
                        {practiceTexts[idx] && (
                          <div className={`p-4 rounded-2xl border-2 animate-in ${accuracy === 100 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">Your Practice</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${accuracy === 100 ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                                {accuracy === 100 ? '완벽해요! ✨' : `일치율 ${accuracy}%`}
                              </span>
                            </div>
                            <p className={`text-sm italic ${accuracy === 100 ? 'text-green-700' : 'text-orange-700'}`}>
                              "{practiceTexts[idx]}"
                            </p>
                            {accuracy < 100 && (
                              <p className="text-[10px] text-orange-400 mt-2 font-medium leading-tight">
                                💡 원본과 조금 달라요! 다시 한번 확인해볼까요?
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-5 border-t border-gray-50 space-y-3">
                    <div>
                      <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Interpretation</span>
                      <p className="text-sm font-medium text-[#555]">{item.korean}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Context</span>
                        <p className="text-[11px] text-[#6B8E23] font-bold">{item.meaning}</p>
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-gray-300 uppercase block mb-1">Grammar</span>
                        <p className="text-[11px] text-[#8B4513] font-medium">{item.grammar}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Guide Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-black text-[#333] mb-6">설치 및 학습 가이드</h3>
            <div className="space-y-6 text-sm text-gray-600">
              <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 mb-2">
                <p className="text-xs font-bold text-yellow-700 mb-1">현재 주소 (임시):</p>
                <code className="text-[10px] break-all block bg-white p-2 rounded border border-yellow-200">{window.location.href}</code>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-lg bg-green-100 text-[#6B8E23] flex-shrink-0 flex items-center justify-center font-bold">🎯</div>
                <div>
                  <p className="font-bold text-[#333]">일치 확인 기능</p>
                  <p className="text-xs mt-1">문장을 입력하고 <b>'답안 보기'</b>를 누르면 AI가 원본과 얼마나 일치하는지 자동으로 계산해줍니다.</p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-6 h-6 rounded-lg bg-green-100 text-[#6B8E23] flex-shrink-0 flex items-center justify-center font-bold">📱</div>
                <div>
                  <p className="font-bold text-[#333]">스마트폰 앱으로 저장</p>
                  <p className="text-xs mt-1">상단의 <b>[앱 다운로드]</b>를 누르거나 브라우저 메뉴에서 <b>'홈 화면에 추가'</b>를 선택하세요.</p>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsGuideOpen(false)}
              className="w-full mt-10 bg-[#6B8E23] text-white py-4 rounded-2xl font-bold active:scale-95 transition-all"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      {deferredPrompt && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
          <button 
            onClick={handleInstallClick}
            className="w-full bg-[#333] text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 animate-in"
          >
            <span>✨</span> 전용 앱으로 소장하기
          </button>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
