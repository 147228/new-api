import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, Button, Typography, Empty, Spin, Modal, Form, Input, Select,
  InputNumber, Tag, Pagination, Space,
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

  useEffect(() => {
    loadProjects(1);
  }, [loadProjects]);

  const handleCreate = async () => {
    const values = formApi.getValues();
    const result = await createProject(values);
    if (result) {
      navigate(`/console/writer/${result.id}`);
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
                    <Text type="tertiary" size="small">{p.novel_type} · {p.language}</Text>
                    <br />
                    <Text type="tertiary" size="small">
                      {t('章节')}: {p.chapter_count} · {t('字数')}: {p.total_words.toLocaleString()}
                    </Text>
                    {p.custom_prompt && (
                      <Paragraph ellipsis={{ rows: 2 }} style={{ marginTop: 8, fontSize: 12, color: 'var(--semi-color-text-2)' }}>
                        {p.custom_prompt}
                      </Paragraph>
                    )}
                    <Text type="quaternary" size="small" style={{ marginTop: 8, display: 'block' }}>
                      {new Date(p.updated_at).toLocaleDateString()}
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
        width={600}
      >
        <Form getFormApi={setFormApi} labelPosition="left" labelWidth={100}>
          <Form.Input field="title" label={t('标题')} placeholder={t('小说标题（可选，稍后填写）')} />
          <Form.Select field="novel_type" label={t('类型')} initValue="奇幻冒险" style={{ width: '100%' }}>
            {NOVEL_TYPES.map((type) => (
              <Select.Option key={type} value={type}>{type}</Select.Option>
            ))}
          </Form.Select>
          <Form.TextArea
            field="custom_prompt"
            label={t('创作要求')}
            placeholder={t('描述你想写的故事：题材、主角、背景、情节走向等')}
            autosize={{ minRows: 3, maxRows: 8 }}
          />
          <Space>
            <Form.InputNumber field="chapter_count" label={t('章节数')} initValue={10} min={1} max={200} style={{ width: 120 }} />
            <Form.InputNumber field="chapter_min_words" label={t('每章最少字数')} initValue={1500} min={500} step={500} style={{ width: 150 }} />
            <Form.InputNumber field="chapter_max_words" label={t('每章最多字数')} initValue={3000} min={500} step={500} style={{ width: 150 }} />
          </Space>
          <Form.Select field="model" label={t('模型')} initValue="gemini-2.5-pro" style={{ width: '100%' }}>
            <Select.Option value="gemini-2.5-pro">Gemini 2.5 Pro</Select.Option>
            <Select.Option value="gemini-2.5-flash">Gemini 2.5 Flash</Select.Option>
            <Select.Option value="claude-sonnet-4-6">Claude Sonnet 4.6</Select.Option>
            <Select.Option value="gpt-4o">GPT-4o</Select.Option>
            <Select.Option value="gpt-4o-mini">GPT-4o Mini</Select.Option>
          </Form.Select>
        </Form>
      </Modal>
    </div>
  );
};

export default Writer;
