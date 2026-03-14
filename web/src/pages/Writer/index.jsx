import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Empty, Spin, Modal, Form, Select,
  InputNumber, Tag, Pagination,
} from '@douyinfe/semi-ui';
import { IconPlus, IconDelete } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { useWriterProjects } from '../../hooks/writer/useWriterProjects';

const { Title, Text, Paragraph } = Typography;

const NOVEL_TYPES = [
  '奇幻冒险', '科幻未来', '悬疑推理', '都市生活', '青春校园',
  '职场商战', '玄幻修仙', '仙侠武侠', '都市异能', '末世危机',
  '现代言情', '言情霸道总裁', '穿越重生', '爽文', '恐怖惊悚',
];

const STATUS_MAP = {
  draft: { text: '草稿', color: 'grey' },
  generating: { text: '生成中', color: 'blue' },
  completed: { text: '已完成', color: 'green' },
  archived: { text: '已归档', color: 'yellow' },
};

const Writer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    projects, loading, activePage, total, pageSize,
    showCreate, setShowCreate,
    loadProjects, createProject, deleteProject,
  } = useWriterProjects();

  const [formApi, setFormApi] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects(1);
  }, [loadProjects]);

  const handleCreate = async () => {
    if (!formApi) return;
    setCreating(true);
    try {
      const values = formApi.getValues();
      // Set reasonable defaults
      values.language = values.language || '中文';
      values.model = values.model || 'gemini-2.5-flash';
      values.chapter_min_words = values.chapter_min_words || 1500;
      values.chapter_max_words = values.chapter_max_words || 3000;
      const result = await createProject(values);
      if (result) {
        navigate(`/console/writer/${result.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    Modal.confirm({
      title: t('确认删除'),
      content: t('删除后不可恢复，确定要删除吗？'),
      onOk: () => deleteProject(id),
    });
  };

  return (
    <div style={{ padding: '20px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title heading={3}>{t('AI 写作')}</Title>
        <Button icon={<IconPlus />} theme="solid" onClick={() => setShowCreate(true)}>
          {t('新建项目')}
        </Button>
      </div>

      <Spin spinning={loading}>
        {projects.length === 0 && !loading ? (
          <Empty
            description={t('还没有写作项目，点击右上角创建')}
            style={{ padding: 60 }}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map((p) => {
              const status = STATUS_MAP[p.status] || STATUS_MAP.draft;
              return (
                <Card
                  key={p.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/console/writer/${p.id}`)}
                  headerLine
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong ellipsis={{ showTooltip: true }} style={{ maxWidth: 200 }}>
                        {p.title || t('未命名项目')}
                      </Text>
                      <Tag color={status.color} size="small">{t(status.text)}</Tag>
                    </div>
                  }
                  headerExtraContent={
                    <Button
                      icon={<IconDelete />}
                      type="danger"
                      theme="borderless"
                      size="small"
                      onClick={(e) => handleDelete(p.id, e)}
                    />
                  }
                >
                  <div style={{ minHeight: 80 }}>
                    <Text type="tertiary" size="small">{p.novel_type} · {p.language || '中文'}</Text>
                    <br />
                    <Text type="tertiary" size="small">
                      {t('章节')}: {p.chapter_count || 0} · {t('字数')}: {(p.total_words || 0).toLocaleString()}
                    </Text>
                    {p.custom_prompt && (
                      <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                        {p.custom_prompt}
                      </Paragraph>
                    )}
                    <Text type="quaternary" size="small" style={{ marginTop: 8, display: 'block' }}>
                      {p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''}
                    </Text>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Spin>

      {total > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
          <Pagination
            total={total}
            pageSize={pageSize}
            currentPage={activePage}
            onChange={(page) => loadProjects(page)}
          />
        </div>
      )}

      <Modal
        title={t('新建写作项目')}
        visible={showCreate}
        onOk={handleCreate}
        onCancel={() => setShowCreate(false)}
        okText={t('创建并开始')}
        confirmLoading={creating}
        width={520}
      >
        <Form getFormApi={setFormApi} labelPosition="top">
          <Form.TextArea
            field="custom_prompt"
            label={t('描述你的小说')}
            placeholder={t('例如：一个穿越到异世界的程序员，利用编程思维修炼魔法，逐步成为大陆最强...')}
            autosize={{ minRows: 3, maxRows: 6 }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Select
              field="novel_type"
              label={t('小说类型')}
              initValue="奇幻冒险"
              style={{ width: '100%' }}
            >
              {NOVEL_TYPES.map((type) => (
                <Select.Option key={type} value={type}>{type}</Select.Option>
              ))}
            </Form.Select>
            <Form.InputNumber
              field="chapter_count"
              label={t('章节数')}
              initValue={10}
              min={1}
              max={200}
              style={{ width: 140 }}
            />
          </div>
          <Form.Select
            field="model"
            label={t('AI 模型')}
            initValue="gemini-3-flash-preview"
            style={{ width: '100%' }}
          >
            <Select.Option value="gemini-3-flash-preview">Gemini 3 Flash — 快速/低价/128K</Select.Option>
            <Select.Option value="gemini-3-pro-preview">Gemini 3 Pro — 均衡/128K</Select.Option>
            <Select.Option value="gemini-3.1-pro-preview">Gemini 3.1 Pro — 均衡/128K</Select.Option>
            <Select.Option value="claude-sonnet-4-6">Claude Sonnet 4.6 — 快速/200K</Select.Option>
            <Select.Option value="claude-opus-4-6">Claude Opus 4.6 — 最强/200K</Select.Option>
            <Select.Option value="gpt-5.2">GPT-5.2 — 快速/高价/128K</Select.Option>
            <Select.Option value="qwen3.5-397b-a17b">Qwen 3.5 MoE — 经济/128K</Select.Option>
          </Form.Select>
        </Form>
      </Modal>
    </div>
  );
};

export default Writer;
