/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Card,
  Input,
  InputNumber,
  Popconfirm,
  Space,
  Table,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconDelete,
  IconPlus,
  IconRefresh,
  IconSave,
  IconSearch,
} from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { API, showError, showSuccess, showWarning } from '../../../helpers';

const TARGET_CACHE_RATIO = 0.15;

const { Text } = Typography;

const parseRatioMap = (value) => {
  if (!value || typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed;
  } catch (error) {
    return {};
  }
};

const isFiniteNumber = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  return Number.isFinite(Number(value));
};

const normalizeRatio = (value) => {
  if (!isFiniteNumber(value)) return '';
  return Number(value);
};

const getModelFamily = (model) => {
  const name = model.toLowerCase();
  if (name.startsWith('gpt-')) return 'GPT';
  if (name.startsWith('deepseek-')) return 'DeepSeek';
  if (name.startsWith('claude-')) return 'Claude';
  if (name.startsWith('gemini-')) return 'Gemini';
  return '';
};

const familyColor = {
  GPT: 'blue',
  DeepSeek: 'violet',
  Claude: 'orange',
  Gemini: 'green',
};

export default function CacheRatioSettings({ options, refresh }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newRatio, setNewRatio] = useState(TARGET_CACHE_RATIO);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const ratioMap = parseRatioMap(options?.CacheRatio || '{}');
    const nextRows = Object.entries(ratioMap)
      .map(([model, ratio]) => ({
        model,
        ratio: normalizeRatio(ratio),
      }))
      .sort((a, b) => a.model.localeCompare(b.model));
    setRows(nextRows);
  }, [options?.CacheRatio]);

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) => row.model.toLowerCase().includes(keyword));
  }, [rows, searchText]);

  const stats = useMemo(() => {
    const validRows = rows.filter((row) => isFiniteNumber(row.ratio));
    const gptCount = rows.filter((row) =>
      row.model.toLowerCase().startsWith('gpt-'),
    ).length;
    const deepSeekCount = rows.filter((row) =>
      row.model.toLowerCase().startsWith('deepseek-'),
    ).length;
    return {
      total: rows.length,
      valid: validRows.length,
      gptCount,
      deepSeekCount,
    };
  }, [rows]);

  const rowsToMap = (nextRows = rows) => {
    const output = {};
    for (const row of nextRows) {
      const model = row.model.trim();
      if (!model) continue;
      if (!isFiniteNumber(row.ratio)) {
        throw new Error(t('缓存倍率必须是数字'));
      }
      output[model] = Number(row.ratio);
    }
    return output;
  };

  const saveRows = async (nextRows = rows, successMessage = t('保存成功')) => {
    let ratioMap;
    try {
      ratioMap = rowsToMap(nextRows);
    } catch (error) {
      showError(error.message);
      return;
    }

    setSaving(true);
    try {
      const res = await API.put('/api/option/', {
        key: 'CacheRatio',
        value: JSON.stringify(ratioMap, null, 2),
      });
      if (res.data.success) {
        showSuccess(successMessage);
        await refresh();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(t('保存失败，请重试'));
    } finally {
      setSaving(false);
    }
  };

  const updateRow = (model, ratio) => {
    setRows((prev) =>
      prev.map((row) =>
        row.model === model ? { ...row, ratio: normalizeRatio(ratio) } : row,
      ),
    );
  };

  const addModel = async () => {
    const model = newModel.trim();
    if (!model) {
      showWarning(t('请输入模型名称'));
      return;
    }
    if (!isFiniteNumber(newRatio)) {
      showWarning(t('请输入有效倍率'));
      return;
    }

    const nextRows = [
      ...rows.filter((row) => row.model !== model),
      { model, ratio: Number(newRatio) },
    ].sort((a, b) => a.model.localeCompare(b.model));

    setRows(nextRows);
    setNewModel('');
    await saveRows(nextRows, t('模型缓存倍率已保存'));
  };

  const deleteModel = async (model) => {
    const nextRows = rows.filter((row) => row.model !== model);
    setRows(nextRows);
    await saveRows(nextRows, t('模型缓存倍率已删除'));
  };

  const setGPTAndDeepSeekToTarget = async () => {
    const nextRows = rows.map((row) => {
      const name = row.model.toLowerCase();
      if (name.startsWith('gpt-') || name.startsWith('deepseek-')) {
        return { ...row, ratio: TARGET_CACHE_RATIO };
      }
      return row;
    });
    setRows(nextRows);
    await saveRows(nextRows, t('GPT 和 DeepSeek 缓存倍率已更新'));
  };

  const columns = [
    {
      title: t('模型'),
      dataIndex: 'model',
      render: (model) => {
        const family = getModelFamily(model);
        return (
          <Space>
            <Text code>{model}</Text>
            {family && (
              <Tag color={familyColor[family]} shape='circle'>
                {family}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: t('缓存命中倍率'),
      dataIndex: 'ratio',
      width: 220,
      render: (ratio, record) => (
        <InputNumber
          value={ratio}
          min={0}
          step={0.01}
          precision={4}
          onChange={(value) => updateRow(record.model, value)}
        />
      ),
    },
    {
      title: t('操作'),
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            icon={<IconSave />}
            loading={saving}
            onClick={() => saveRows(rows, t('保存成功'))}
          />
          <Popconfirm
            title={t('确定删除该模型的缓存倍率吗？')}
            onConfirm={() => deleteModel(record.model)}
          >
            <Button icon={<IconDelete />} type='danger' />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space vertical align='start' style={{ width: '100%' }}>
      <Banner
        type='info'
        closeIcon={null}
        description={t(
          '这里配置的是缓存命中 token 的计费倍率。保存后会立即写入系统选项并刷新内存配置，无需重启服务。',
        )}
      />

      <Card style={{ width: '100%' }}>
        <Space wrap>
          <Tag color='blue' size='large'>
            {t('共 {{count}} 项', { count: stats.total })}
          </Tag>
          <Tag color='green' size='large'>
            {t('GPT {{count}} 项', { count: stats.gptCount })}
          </Tag>
          <Tag color='violet' size='large'>
            {t('DeepSeek {{count}} 项', { count: stats.deepSeekCount })}
          </Tag>
          <Tag color='grey' size='large'>
            {t('有效 {{count}} 项', { count: stats.valid })}
          </Tag>
        </Space>
      </Card>

      <Space wrap style={{ width: '100%' }}>
        <Input
          prefix={<IconSearch />}
          value={searchText}
          placeholder={t('搜索模型')}
          onChange={setSearchText}
          style={{ width: 280 }}
        />
        <Button icon={<IconRefresh />} onClick={refresh}>
          {t('刷新')}
        </Button>
        <Button
          type='primary'
          icon={<IconSave />}
          loading={saving}
          onClick={() => saveRows(rows)}
        >
          {t('保存全部')}
        </Button>
        <Button loading={saving} onClick={setGPTAndDeepSeekToTarget}>
          {t('GPT/DeepSeek 设为 0.15')}
        </Button>
      </Space>

      <Space wrap style={{ width: '100%' }}>
        <Input
          value={newModel}
          placeholder={t('模型名称，例如 gpt-5.4')}
          onChange={setNewModel}
          style={{ width: 320 }}
        />
        <InputNumber
          value={newRatio}
          min={0}
          step={0.01}
          precision={4}
          onChange={setNewRatio}
        />
        <Button
          icon={<IconPlus />}
          type='primary'
          loading={saving}
          onClick={addModel}
        >
          {t('新增或覆盖')}
        </Button>
      </Space>

      <Table
        rowKey='model'
        columns={columns}
        dataSource={filteredRows}
        loading={saving}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        style={{ width: '100%' }}
      />
    </Space>
  );
}
