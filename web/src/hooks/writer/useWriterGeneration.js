import { useState, useRef, useCallback } from 'react';

export const useWriterGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [progress, setProgress] = useState('');
  const eventSourceRef = useRef(null);

  const startGeneration = useCallback(async (url, body) => {
    setGenerating(true);
    setGeneratedText('');
    setProgress('正在准备生成...');

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`,
          'New-API-User': localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).id?.toString() : '',
        },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            switch (data.type) {
              case 'chunk':
                fullText += data.text;
                setGeneratedText(fullText);
                break;
              case 'progress':
                setProgress(data.message);
                break;
              case 'complete':
                setProgress(`生成完成！共 ${data.word_count} 字`);
                break;
              case 'batch_progress':
                setProgress(`正在生成第 ${data.current_chapter}/${data.total_chapters} 章...`);
                break;
              case 'batch_complete':
                setProgress(`全部生成完成！共 ${data.total_chapters} 章`);
                break;
              case 'error':
                setProgress(`错误：${data.message}`);
                break;
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      setProgress(`生成失败：${e.message}`);
    } finally {
      setGenerating(false);
    }
  }, []);

  const stopGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setGenerating(false);
    setProgress('已停止');
  }, []);

  return {
    generating, generatedText, progress,
    startGeneration, stopGeneration,
    setGeneratedText, setProgress,
  };
};
