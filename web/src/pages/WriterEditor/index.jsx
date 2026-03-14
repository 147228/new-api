import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Button, Tag, Spin, Empty,
  Divider, Tooltip, Input, Tree,
} from '@douyinfe/semi-ui';
import {
  IconArrowLeft, IconPlay, IconStop, IconDownload, IconBolt,
  IconSend, IconChevronLeft, IconChevronRight,
  IconFolder, IconFile, IconSave,
} from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { useWriterGeneration } from '../../hooks/writer/useWriterGeneration';

const { Title, Text } = Typography;
const { TextArea } = Input;

const WriterEditor = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('content');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  const {
    generating, generatedText, progress,
    startGeneration, stopGeneration,
    setGeneratedText, setProgress,
  } = useWriterGeneration();

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/writer-api/api/projects/${projectId}`);
      if (res.data.success) {
        setProject(res.data.data.project);
        setChapters(res.data.data.chapters || []);
      } else {
        showError(res.data.message || t('加载失败'));
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  }, [projectId, t]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Track generation progress in chat messages
  useEffect(() => {
    if (progress) {
      setChatMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'system') {
          return [...prev.slice(0, -1), { role: 'system', content: progress }];
        }
        return [...prev, { role: 'system', content: progress }];
      });
    }
  }, [progress]);

  const getChapterTitle = useCallback((index) => {
    try {
      if (project?.outline) {
        const outline = JSON.parse(project.outline);
        if (Array.isArray(outline) && index - 1 < outline.length) {
          return outline[index - 1]?.title || '';
        }
      }
    } catch { /* ignore */ }
    return '';
  }, [project]);

  const getChapterStatus = useCallback((index) => {
    const ch = chapters.find((c) => c.chapter_index === index);
    if (!ch) return { status: 'pending', color: 'grey', text: t('未生成') };
    if (ch.status === 'completed') return { status: 'completed', color: 'green', text: `${ch.word_count || 0}${t('字')}` };
    if (ch.status === 'generating') return { status: 'generating', color: 'blue', text: t('生成中') };
    if (ch.status === 'failed') return { status: 'failed', color: 'red', text: t('失败') };
    return { status: ch.status, color: 'orange', text: ch.status };
  }, [chapters, t]);

  const handleSelectChapter = (ch) => {
    setSelectedChapter(ch);
    setGeneratedText(ch.content || '');
    setViewMode('content');
  };

  const handleGenerateChapter = async (chapterIndex) => {
    const chapterTitle = getChapterTitle(chapterIndex);
    setViewMode('content');
    await startGeneration(
      '/writer-api/api/generation/chapter',
      {
        project_id: parseInt(projectId),
        chapter_index: chapterIndex,
        chapter_title: chapterTitle,
      }
    );
    await loadProject();
  };

  const handleGenerateOutline = async () => {
    setViewMode('outline');
    await startGeneration(
      '/writer-api/api/outlines/generate',
      {
        project_id: parseInt(projectId),
        custom_prompt: project?.custom_prompt || '',
        novel_type: project?.novel_type || '奇幻冒险',
        chapter_count: project?.chapter_count || 10,
      }
    );
    await loadProject();
  };

  const handleOneClickGenerate = async () => {
    if (!project?.outline) {
      setViewMode('outline');
      setProgress(t('第一步：正在生成大纲...'));
      await startGeneration(
        '/writer-api/api/outlines/generate',
        {
          project_id: parseInt(projectId),
          custom_prompt: project?.custom_prompt || '',
          novel_type: project?.novel_type || '奇幻冒险',
          chapter_count: project?.chapter_count || 10,
        }
      );
      await loadProject();
    }
    setViewMode('content');
    await startGeneration(
      '/writer-api/api/generation/batch',
      {
        project_id: parseInt(projectId),
        start_chapter: 1,
      }
    );
    await loadProject();
  };

  const handleExport = () => {
    window.open(`/writer-api/api/projects/${projectId}/export`, '_blank');
  };

  const handleSave = async () => {
    if (!selectedChapter) return;
    try {
      const res = await API.put(`/writer-api/api/chapters/${selectedChapter.id}`, {
        content: generatedText,
      });
      if (res.data.success) {
        showSuccess(t('保存成功'));
        await loadProject();
      } else {
        showError(res.data.message || t('保存失败'));
      }
    } catch (e) {
      showError(e.message);
    }
  };

  const chapterCount = project?.chapter_count || 10;
  const completedCount = chapters.filter(c => c.status === 'completed').length;
  const totalWordCount = chapters.reduce((sum, c) => sum + (c.word_count || 0), 0);

  // Build tree data for left panel
  const treeData = useMemo(() => {
    const chapterNodes = Array.from({ length: chapterCount }, (_, i) => {
      const index = i + 1;
      const title = getChapterTitle(index);
      const { status, color } = getChapterStatus(index);
      const statusIcon = status === 'completed' ? '✓' : status === 'generating' ? '●' : '○';
      return {
        key: `chapter-${index}`,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text size="small" ellipsis={{ showTooltip: true }} style={{ flex: 1, minWidth: 0 }}>
              {`第${index}章 ${title || t('未命名')}`}
            </Text>
            <Text size="small" style={{ marginLeft: 4, flexShrink: 0, color: color === 'green' ? 'var(--semi-color-success)' : color === 'blue' ? 'var(--semi-color-primary)' : color === 'red' ? 'var(--semi-color-danger)' : 'var(--semi-color-text-2)' }}>
              {statusIcon}
            </Text>
          </div>
        ),
        icon: <IconFile size="small" />,
        isLeaf: true,
        chapterIndex: index,
      };
    });

    const outlineNode = {
      key: 'outline',
      label: t('大纲'),
      icon: <IconFile size="small" />,
      isLeaf: true,
    };

    return [
      {
        key: 'main-content',
        label: t('主要内容'),
        icon: <IconFolder />,
        children: [
          {
            key: 'volume-1',
            label: t('第一卷'),
            icon: <IconFolder size="small" />,
            children: chapterNodes,
          },
          outlineNode,
        ],
      },
      {
        key: 'settings',
        label: (
          <Text type="tertiary" size="small">{t('设定')} ({t('待开发')})</Text>
        ),
        icon: <IconFolder />,
        disabled: true,
        children: [],
      },
    ];
  }, [chapterCount, getChapterTitle, getChapterStatus, t]);

  const handleTreeSelect = (key) => {
    if (!key || key === 'main-content' || key === 'volume-1' || key === 'settings') return;
    if (key === 'outline') {
      setSelectedChapter(null);
      setViewMode('outline');
      return;
    }
    if (key.startsWith('chapter-')) {
      const index = parseInt(key.replace('chapter-', ''));
      const ch = chapters.find((c) => c.chapter_index === index);
      if (ch) {
        handleSelectChapter(ch);
      } else {
        handleGenerateChapter(index);
      }
    }
  };

  // ---------- Render helpers ----------

  const renderLeftPanel = () => (
    <div style={{
      width: 220, minWidth: 220, height: '100%',
      borderRight: '1px solid var(--semi-color-border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--semi-color-bg-0)',
    }}>
      {/* Header */}
      <div style={{ padding: '12px 12px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Button
            icon={<IconArrowLeft size="small" />}
            theme="borderless" size="small"
            onClick={() => navigate('/console/writer')}
          />
          <Title heading={6} ellipsis={{ showTooltip: true }} style={{ margin: 0, flex: 1 }}>
            {project.title || t('未命名')}
          </Title>
        </div>
        <Text type="tertiary" size="small" style={{ paddingLeft: 4 }}>
          {project.novel_type} · {project.model}
        </Text>
      </div>
      <Divider style={{ margin: 0 }} />

      {/* Tree */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        <Tree
          treeData={treeData}
          directory
          defaultExpandAll
          onSelect={(key) => handleTreeSelect(key)}
          style={{ padding: '0 4px' }}
        />
      </div>
    </div>
  );

  const renderCenterPanel = () => {
    const isOutline = viewMode === 'outline';
    const currentTitle = isOutline
      ? t('大纲')
      : selectedChapter
        ? `${t('第')}${selectedChapter.chapter_index}${t('章')} ${getChapterTitle(selectedChapter.chapter_index)}`
        : t('选择章节开始编辑');

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Toolbar */}
        <div style={{
          height: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '1px solid var(--semi-color-border)',
          background: 'var(--semi-color-bg-0)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text size="small" type="tertiary">
              {totalWordCount > 0 ? `${totalWordCount}${t('字')}` : ''}
            </Text>
            {totalWordCount > 0 && <Divider layout="vertical" style={{ height: 16 }} />}
            <Tooltip content={project?.outline ? t('重新生成大纲') : t('生成大纲')}>
              <Button size="small" icon={<IconBolt size="small" />} theme="borderless" onClick={handleGenerateOutline} disabled={generating}>
                {t('生成大纲')}
              </Button>
            </Tooltip>
            <Tooltip content={t('生成选中章节')}>
              <Button
                size="small" theme="borderless"
                icon={<IconPlay size="small" />}
                disabled={generating || !selectedChapter}
                onClick={() => selectedChapter && handleGenerateChapter(selectedChapter.chapter_index)}
              >
                {t('生成章节')}
              </Button>
            </Tooltip>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              size="small"
              type={generating ? 'danger' : 'primary'}
              theme="solid"
              icon={generating ? <IconStop size="small" /> : <IconPlay size="small" />}
              onClick={generating ? stopGeneration : handleOneClickGenerate}
            >
              {generating ? t('停止') : completedCount > 0 ? t('继续生成') : t('一键生成')}
            </Button>
          </div>
        </div>

        {/* Chapter title */}
        <div style={{ padding: '16px 24px 8px' }}>
          <Title heading={4} style={{ margin: 0 }}>{currentTitle}</Title>
        </div>

        {/* Content area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }}>
          {isOutline ? renderOutlineContent() : renderChapterContent()}
        </div>
      </div>
    );
  };

  const renderOutlineContent = () => {
    if (!project?.outline) {
      return (
        <Empty description={t('暂无大纲，点击「一键生成全书」会自动创建')} style={{ marginTop: 60 }} />
      );
    }
    try {
      const outline = JSON.parse(project.outline);
      if (!Array.isArray(outline)) {
        return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>{project.outline}</div>;
      }
      return (
        <div style={{ lineHeight: 1.6, fontSize: 14 }}>
          {outline.map((item, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 15 }}>{i + 1}. {item.title}</Text>
              <br />
              <Text type="tertiary">{item.summary}</Text>
            </div>
          ))}
        </div>
      );
    } catch {
      return <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14 }}>{project.outline}</div>;
    }
  };

  const renderChapterContent = () => {
    const text = generatedText || '';
    if (!text && !selectedChapter) {
      return (
        <Empty
          description={t('点击左侧章节或「一键生成」开始创作')}
          style={{ marginTop: 60 }}
        />
      );
    }
    return (
      <div style={{
        whiteSpace: 'pre-wrap',
        lineHeight: 1.8,
        fontSize: 15,
        color: 'var(--semi-color-text-0)',
      }}>
        {text || (
          <Text type="quaternary">{t('该章节尚无内容')}</Text>
        )}
      </div>
    );
  };

  const renderRightPanel = () => (
    <div style={{
      width: 300, minWidth: 300, height: '100%',
      borderLeft: '1px solid var(--semi-color-border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--semi-color-bg-0)',
    }}>
      {/* Header */}
      <div style={{
        height: 44, minHeight: 44,
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid var(--semi-color-border)',
      }}>
        <Text strong>{t('AI 对话')}</Text>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Text type="quaternary" size="small">{t('生成进度将在此显示')}</Text>
          </div>
        ) : (
          chatMessages.map((msg, i) => (
            <div key={i} style={{
              marginBottom: 8,
              padding: '8px 10px',
              borderRadius: 8,
              background: msg.role === 'system'
                ? 'var(--semi-color-primary-light-default)'
                : msg.role === 'user'
                  ? 'var(--semi-color-fill-0)'
                  : 'var(--semi-color-bg-2)',
              fontSize: 13,
            }}>
              <Text size="small">{msg.content}</Text>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: '6px 12px' }}>
        <Text size="small" type="tertiary">
          {t('总字数')}: {totalWordCount > 1000 ? `${(totalWordCount / 1000).toFixed(1)}k` : totalWordCount}{t('字')}
        </Text>
      </div>

      {/* Input area */}
      <Divider style={{ margin: 0 }} />
      <div style={{ padding: 12 }}>
        <TextArea
          value={chatInput}
          onChange={setChatInput}
          placeholder={t('输入消息...')}
          autosize={{ minRows: 2, maxRows: 4 }}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tag size="small" color="blue">{project?.model || 'AI'}</Tag>
          <Button
            size="small" theme="solid"
            icon={<IconSend size="small" />}
            disabled={!chatInput.trim()}
            onClick={() => {
              if (!chatInput.trim()) return;
              setChatMessages((prev) => [...prev, { role: 'user', content: chatInput }]);
              setChatInput('');
              // AI chat backend TBD
              setChatMessages((prev) => [...prev, { role: 'assistant', content: t('AI 对话功能即将上线') }]);
            }}
          >
            {t('发送')}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderBottomBar = () => (
    <div style={{
      height: 48, minHeight: 48,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      borderTop: '1px solid var(--semi-color-border)',
      background: 'var(--semi-color-bg-0)',
    }}>
      <Text size="small" type="tertiary">
        {completedCount}/{chapterCount} {t('章')} · {totalWordCount}{t('字')}
      </Text>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          icon={<IconDownload size="small" />}
          size="small"
          disabled={completedCount === 0}
          onClick={handleExport}
        >
          {t('导出')}
        </Button>
        <Button
          icon={<IconSave size="small" />}
          size="small" theme="solid"
          disabled={!selectedChapter}
          onClick={handleSave}
        >
          {t('保存作品')}
        </Button>
      </div>
    </div>
  );

  // ---------- Main render ----------

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!project) return <Empty description={t('项目不存在')} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)' }}>
      {/* Main 3-column body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left panel */}
        {!leftCollapsed && renderLeftPanel()}
        {/* Left toggle */}
        <div
          onClick={() => setLeftCollapsed(!leftCollapsed)}
          style={{
            width: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--semi-color-bg-1)',
            borderRight: '1px solid var(--semi-color-border)',
            flexShrink: 0,
          }}
          title={leftCollapsed ? t('展开左侧面板') : t('折叠左侧面板')}
        >
          {leftCollapsed ? <IconChevronRight size="extra-small" /> : <IconChevronLeft size="extra-small" />}
        </div>

        {/* Center panel */}
        {renderCenterPanel()}

        {/* Right toggle */}
        <div
          onClick={() => setRightCollapsed(!rightCollapsed)}
          style={{
            width: 16, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--semi-color-bg-1)',
            borderLeft: '1px solid var(--semi-color-border)',
            flexShrink: 0,
          }}
          title={rightCollapsed ? t('展开右侧面板') : t('折叠右侧面板')}
        >
          {rightCollapsed ? <IconChevronLeft size="extra-small" /> : <IconChevronRight size="extra-small" />}
        </div>

        {/* Right panel */}
        {!rightCollapsed && renderRightPanel()}
      </div>

      {/* Bottom bar */}
      {renderBottomBar()}
    </div>
  );
};

export default WriterEditor;
