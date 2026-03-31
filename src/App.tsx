/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Loader2, Copy, Check, Languages, Trash2, Download } from "lucide-react";

const LANGUAGES = [
  { label: "Description/Context (if needed)", key: "context" },
  { label: "English (United Kingdom) [en-GB]*", key: "en-GB" },
  { label: "Arabic (Saudi Arabia) [ar-SA]", key: "ar-SA" },
  { label: "Catalan (Spain) [ca-ES]", key: "ca-ES" },
  { label: "Chinese, Traditional (Hong Kong) [zh-Hant-HK]", key: "zh-Hant-HK" },
  { label: "Chinese, Traditional (Taiwan) [zh-Hant-TW]", key: "zh-Hant-TW" },
  { label: "Croatian (Croatia) [hr-HR]", key: "hr-HR" },
  { label: "Czech (Czechia) [cs-CZ]", key: "cs-CZ" },
  { label: "Danish (Denmark) [da-DK]", key: "da-DK" },
  { label: "Dutch (Netherlands) [nl-NL]", key: "nl-NL" },
  { label: "English (Australia) [en-AU]", key: "en-AU" },
  { label: "English (Canada) [en-CA]", key: "en-CA" },
  { label: "English (United States) [en-US]", key: "en-US" },
  { label: "Finnish (Finland) [fi-FI]", key: "fi-FI" },
  { label: "French (Canada) [fr-CA]", key: "fr-CA" },
  { label: "French (France) [fr-FR]", key: "fr-FR" },
  { label: "German (Germany) [de-DE]", key: "de-DE" },
  { label: "German (Switzerland) [de-CH]", key: "de-CH" },
  { label: "Greek (Greece) [el-GR]", key: "el-GR" },
  { label: "Hebrew (Israel) [he-IL]", key: "he-IL" },
  { label: "Hindi (India) [hi-IN]", key: "hi-IN" },
  { label: "Hungarian (Hungary) [hu-HU]", key: "hu-HU" },
  { label: "Indonesian (Indonesia) [id-ID]", key: "id-ID" },
  { label: "Italian (Italy) [it-IT]", key: "it-IT" },
  { label: "Japanese (Japan) [ja-JP]", key: "ja-JP" },
  { label: "Korean (South Korea) [ko-KR]", key: "ko-KR" },
  { label: "Norwegian (Norway) [no-NO]", key: "no-NO" },
  { label: "Polish (Poland) [pl-PL]", key: "pl-PL" },
  { label: "Portuguese (Brazil) [pt-BR]", key: "pt-BR" },
  { label: "Portuguese (Portugal) [pt-PT]", key: "pt-PT" },
  { label: "Romanian (Romania) [ro-RO]", key: "ro-RO" },
  { label: "Russian (Russia) [ru-RU]", key: "ru-RU" },
  { label: "Slovak (Slovakia) [sk-SK]", key: "sk-SK" },
  { label: "Spanish (Mexico) [es-MX]", key: "es-MX" },
  { label: "Spanish (Spain) [es-ES]", key: "es-ES" },
  { label: "Swedish (Sweden) [sv-SE]", key: "sv-SE" },
  { label: "Thai (Thailand) [th-TH]", key: "th-TH" },
  { label: "Turkish (Turkey) [tr-TR]", key: "tr-TR" },
  { label: "Ukrainian (Ukraine) [uk-UA]", key: "uk-UA" },
  { label: "Vietnamese (Vietnam) [vi-VN]", key: "vi-VN" },
];

interface TranslationResult {
  term: string;
  translations: Record<string, string>;
}

export default function App() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = async () => {
    const terms = input.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    if (terms.length === 0) return;
    if (terms.length > 50) {
      setError("最多支持输入50个词条");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const response = await ai.models.generateContent({
        model,
        contents: `Translate the following Simplified Chinese terms into the specified languages. 
        For each term, provide a translation for each language code.
        Also provide a short description/context for the term in the 'context' field.
        
        Terms: ${terms.join(', ')}
        
        Languages to translate to:
        ${LANGUAGES.filter(l => l.key !== 'context').map(l => `${l.label} (${l.key})`).join('\n')}
        `,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                term: { type: Type.STRING },
                translations: {
                  type: Type.OBJECT,
                  properties: LANGUAGES.reduce((acc, lang) => {
                    acc[lang.key] = { type: Type.STRING };
                    return acc;
                  }, {} as any),
                  required: LANGUAGES.map(l => l.key)
                }
              },
              required: ["term", "translations"]
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setResults(data);
    } catch (err) {
      console.error(err);
      setError("翻译过程中出错，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (results.length === 0) return;

    // Create TSV content
    const header = LANGUAGES.map(l => l.label).join('\t');
    const rows = results.map(res => 
      LANGUAGES.map(lang => res.translations[lang.key] || "").join('\t')
    ).join('\n');

    const fullText = `${header}\n${rows}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAsHtml = () => {
    if (results.length === 0) return;

    let html = '<table border="1" style="border-collapse: collapse; width: 100%; font-family: sans-serif;">\n';
    html += '  <thead>\n    <tr style="background-color: #f2f2f2;">\n';
    html += '      <th style="padding: 8px; text-align: left;">Original (ZH)</th>\n';
    LANGUAGES.forEach(lang => {
      html += `      <th style="padding: 8px; text-align: left;">${lang.label}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n  <tbody>\n';

    results.forEach(res => {
      html += '    <tr>\n';
      html += `      <td style="padding: 8px; font-weight: bold;">${res.term}</td>\n`;
      LANGUAGES.forEach(lang => {
        html += `      <td style="padding: 8px;">${res.translations[lang.key] || ""}</td>\n`;
      });
      html += '    </tr>\n';
    });

    html += '  </tbody>\n</table>';

    navigator.clipboard.writeText(html);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const downloadHtml = () => {
    if (results.length === 0) return;

    let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Translation Results</title>\n';
    html += '  <style>\n    table { border-collapse: collapse; width: 100%; font-family: sans-serif; }\n';
    html += '    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }\n';
    html += '    th { background-color: #141414; color: white; }\n';
    html += '    tr:nth-child(even) { background-color: #f9f9f9; }\n';
    html += '    tr:hover { background-color: #f1f1f1; }\n';
    html += '  </style>\n</head>\n<body>\n';
    html += '  <h1>Translation Results</h1>\n';
    html += '  <table>\n    <thead>\n      <tr>\n';
    html += '        <th>Original (ZH)</th>\n';
    LANGUAGES.forEach(lang => {
      html += `        <th>${lang.label}</th>\n`;
    });
    html += '      </tr>\n    </thead>\n    <tbody>\n';

    results.forEach(res => {
      html += '      <tr>\n';
      html += `        <td style="font-weight: bold;">${res.term}</td>\n`;
      LANGUAGES.forEach(lang => {
        html += `        <td>${res.translations[lang.key] || ""}</td>\n`;
      });
      html += '      </tr>\n';
    });

    html += '    </tbody>\n  </table>\n</body>\n</html>';

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translations_${new Date().getTime()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clear = () => {
    setInput("");
    setResults([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#141414] pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#141414] p-2 rounded-sm">
              <Languages className="text-[#E4E3E0] w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight uppercase italic font-serif">
              Multi-Lang Translator
            </h1>
          </div>
          <div className="text-[11px] uppercase tracking-widest opacity-50 font-mono">
            v1.0.0 / 40 Languages / Max 50 Terms
          </div>
        </header>

        {/* Input Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-widest opacity-50 font-mono italic">
                Input Terms (One per line, max 50)
              </label>
              <button 
                onClick={clear}
                className="text-[11px] uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入简体中文词条，例如：&#10;首页&#10;个人中心&#10;设置"
              className="w-full h-48 p-4 bg-white border border-[#141414] focus:outline-none focus:ring-1 focus:ring-[#141414] resize-none font-mono text-sm"
            />
            <button
              onClick={translate}
              disabled={loading || !input.trim()}
              className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-bold uppercase tracking-widest hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Translating...
                </>
              ) : (
                "Start Translation"
              )}
            </button>
            {error && <p className="text-red-600 text-xs font-mono">{error}</p>}
          </div>

          <div className="bg-white border border-[#141414] p-6 space-y-4">
            <h3 className="font-serif italic text-lg border-b border-[#141414] pb-2">Instructions</h3>
            <ul className="text-xs space-y-3 font-mono opacity-80 leading-relaxed">
              <li>1. Enter up to 50 Simplified Chinese terms in the text area.</li>
              <li>2. Click "Start Translation" to process with Gemini AI.</li>
              <li>3. Review the generated translations in the table below.</li>
              <li>4. Use "Copy Table" for TSV format (Excel/Sheets) or "Copy HTML" for web use.</li>
            </ul>
          </div>
        </section>

        {/* Results Section */}
        {results.length > 0 && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-widest opacity-50 font-mono italic">
                Translation Results
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-white border border-[#141414] text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all flex items-center gap-2"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy TSV"}
                </button>
                <button
                  onClick={copyAsHtml}
                  className="px-4 py-2 bg-white border border-[#141414] text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all flex items-center gap-2"
                >
                  {copiedHtml ? <Check size={14} /> : <Copy size={14} />}
                  {copiedHtml ? "Copied!" : "Copy HTML"}
                </button>
                <button
                  onClick={downloadHtml}
                  className="px-4 py-2 bg-white border border-[#141414] text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all flex items-center gap-2"
                >
                  <Download size={14} />
                  Download HTML
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-[#141414] bg-white">
              <table className="w-full text-left border-collapse min-w-[2000px]">
                <thead>
                  <tr className="bg-[#141414] text-[#E4E3E0]">
                    <th className="p-3 border border-[#E4E3E0]/20 text-[10px] uppercase tracking-wider font-mono">Original (ZH)</th>
                    {LANGUAGES.map((lang) => (
                      <th key={lang.key} className="p-3 border border-[#E4E3E0]/20 text-[10px] uppercase tracking-wider font-mono">
                        {lang.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((res, idx) => (
                    <tr key={idx} className="hover:bg-[#F5F5F4] transition-colors">
                      <td className="p-3 border border-[#141414]/10 font-bold text-sm bg-[#F5F5F4]/50">{res.term}</td>
                      {LANGUAGES.map((lang) => (
                        <td key={lang.key} className="p-3 border border-[#141414]/10 text-sm font-mono whitespace-nowrap">
                          {res.translations[lang.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
