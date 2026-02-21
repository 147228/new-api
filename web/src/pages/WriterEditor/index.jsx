import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Layout, Typography, Button, List, Tag, Spin, Toast, Empty,
  TextArea, Space, Divider, Modal, Tabs, TabPane,
} from '@douyinfe/semi-ui';
import { IconArrowLeft, IconPlay, IconStop, IconDownload, IconBolt } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess } from '../../helpers';
import { useWriterGeneration } from '../../hooks/writer/useWriterGeneration';

const { Sider, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const WriterEditor = () => {
  const { t } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('content');

  const {
    generating, generatedText, progress,
    startGeneration, stopGeneration,
    setGeneratedText,
  } = useWriterGeneration();

  const loadProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`/writer-api/api/projects/${projectId}`);
      if (res.data.success) {
        setProject(res.data.data.project);
        setChapters(res.data.data.chapters || []);
      } else {
        showError(res.data.message);
      }
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const handleSelectChapter = (ch) => {
    setSelectedChapter(ch);
    setGeneratedText(ch.content || '');
    setActiveTab('content');
  };

  const handleGenerateChapter = async (chapterIndex) => {
    const chapterTitle = getChapterTitle(chapterIndex);
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

  const handleBatchGenerate = async () => {
    Modal.confirm({
      title: t('批量生成'),
      content: t('将从第1章开始连续生成所有章节，确定继续吗？'),
      onOk: async () => {
        await startGeneration(
          '/writer-api/api/generation/batch',
          {
            project_id: parseInt(projectId),
            start_chapter: 1,
          }
        );
        await loadProject();
      },
    });
  };

  const handleExport = async () => {
    try {
      window.open(`/writer-api/api/projects/${projectId}/export`, '_blank');
    } catch (e) {
      showError(e.message);
    }
  };

  const getChapterTitle = (index) => {
    try {
      if (project?.outline) {
        const outline = JSON.parse(project.outline);
        if (Array.isArray(outline) && index - 1 < outline.length) {
          return outline[index - 1]?.title || '';
        }
      }
    } catch { /* ignore */ }
    return '';
  };

  const getChapterStatus = (index) => {
    const ch = chapters.find((c) => c.chapter_index === index);
    if (!ch) return { status: 'pending', color: 'grey', text: t('未生成') };
    if (ch.status === 'completed') return { status: 'completed', color: 'green', text: `${ch.word_count}${t('字')}` };
    if (ch.status === 'generating') return { status: 'generating', color: 'blue', text: t('生成中') };
    return { status: ch.status, color: 'orange', text: ch.status };
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!project) return <Empty description={t('项目不存在')} />;

  const chapterCount = project.chapter_count || 10;

  return (
    <Layout style={{ height: 'calc(100vh - 60px)' }}>
      <Sider style={{ width: 280, borderRight: '1px solid var(--semi-color-border)', overflow: 'auto', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Button icon={<IconArrowLeft />} theme="borderless" size="small" onClick={() => navigate('/console/writer')} />
          <Title heading={5} ellipsis={{ showTooltip: true }} style={{ margin: 0, flex: 1 }}>
            {project.title || t('未命名')}
          </Title>
        </div>

        <Text type="tertiary" size="small">{project.novel_type} · {project.model}</Text>
        <Divider margin={8} />

        <Space style={{ marginBottom: 8 }}>
          <Button size="small" icon={<IconBolt />} onClick={handleGenerateOutline} disabled={generating}>
            {t('生成大纲')}
          </Button>
          <Button size="small" icon={<IconPlay />} theme="solid" onClick={handleBatchGenerate} disabled={generating}>
            {t('批量生成')}
          </Button>
        </Space>

        <List
          size="small"
          dataSource={Array.from({ length: chapterCount }, (_, i) => i + 1)}
          renderItem={(index) => {
            const { color, text: statusText } = getChapterStatus(index);
            const title = getChapterTitle(index);
            const ch = chapters.find((c) => c.chapter_index === index);
            const isSelected = selectedChapter?.chapter_index === index;
            return (
              <List.Item
                key={index}
                style={{
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: isSelected ? 'var(--semi-color-primary-light-default)' : 'transparent',
                }}
                onClick={() => ch ? handleSelectChapter(ch) : handleGenerateChapter(index)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Text size="small" ellipsis style={{ maxWidth: 160 }}>
                    {t('第')} {index} {t('章')} {title && `· ${title}`}
                  </Text>
                  <Tag color={color} size="small">{statusText}</Tag>
                </div>
              </List.Item>
            );
          }}
        />
      </Sider>

      <Content style={{ padding: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            {generating && (
              <Button icon={<IconStop />} type="danger" onClick={stopGeneration}>
                {t('停止')}
              </Button>
            )}
            <Button icon={<IconDownload />} theme="borderless" onClick={handleExport}>
              {t('导出')}
            </Button>
          </Space>
          {progress && (
            <Text type="tertiary" size="small">{progress}</Text>
          )}
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={t('正文')} itemKey="content">
            <div style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.8,
              fontSize: 15,
              padding: 16,
              minHeight: 400,
              background: 'var(--semi-color-bg-1)',
              borderRadius: 8,
            }}>
              {generatedText || (
                <Text type="quaternary">{t('点击左侧章节开始生成，或点击"批量生成"一键生成所有章节')}</Text>
              )}
            </div>
          </TabPane>
          <TabPane tab={t('大纲')} itemKey="outline">
            <div style={{
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              fontSize: 14,
              padding: 16,
              minHeight: 400,
              background: 'var(--semi-color-bg-1)',
              borderRadius: 8,
            }}>
              {project.outline ? (
                (() => {
                  try {
                    const outline = JSON.parse(project.outline);
                    return outline.map((item, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <Text strong>{t('第')} {item.chapter || i + 1} {t('章')}：{item.title}</Text>
                        <br />
                        <Text type="tertiary">{item.summary}</Text>
                      </div>
                    ));
                  } catch {
                    return <Text>{project.outline}</Text>;
                  }
                })()
              ) : (
                <Text type="quaternary">{t('暂无大纲，点击"生成大纲"自动创建')}</Text>
              )}
            </div>
          </TabPane>
          <TabPane tab={t('设置')} itemKey="settings">
            <div style={{ padding: 16, maxWidth: 500 }}>
              <Text>{t('模型')}: {project.model}</Text><br />
              <Text>{t('类型')}: {project.novel_type}</Text><br />
              <Text>{t('语言')}: {project.language}</Text><br />
              <Text>{t('章节数')}: {project.chapter_count}</Text><br />
              <Text>{t('每章字数')}: {project.chapter_min_words} - {project.chapter_max_words}</Text><br />
              <Text>{t('已消耗额度')}: {project.total_quota_consumed}</Text><br />
              <Divider />
              <Title heading={6}>{t('创作要求')}</Title>
              <Paragraph>{project.custom_prompt || t('无')}</Paragraph>
            </div>
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default WriterEditor;
