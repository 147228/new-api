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

import React, { useEffect, useRef, useState } from 'react';
import {
  Banner,
  Button,
  Col,
  Form,
  Row,
  Space,
  Spin,
  Typography,
} from '@douyinfe/semi-ui';
import {
  API,
  compareObjects,
  showError,
  showSuccess,
  showWarning,
  verifyJSON,
} from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const KEY_VISIBLE_MODELS = 'DesktopVisibleModels';
const KEY_MODELS_CONFIG = 'DesktopModelsConfig';
const KEY_MODEL_ORDER = 'DesktopModelOrder';
const KEY_DEFAULT_MODEL = 'DesktopDefaultModel';
const KEY_MODEL_ROUTING = 'DesktopModelRouting';

const defaultInputs = {
  [KEY_VISIBLE_MODELS]: '',
  [KEY_MODELS_CONFIG]: '',
  [KEY_MODEL_ORDER]: '',
  [KEY_DEFAULT_MODEL]: '',
  [KEY_MODEL_ROUTING]: '',
};

const desktopModelsConfigExample = JSON.stringify(
  {
    providerName: '丸美小沐',
    defaultModel: 'gemini-3.1-pro-preview',
    models: [
      {
        id: 'gemini-3.1-pro-preview',
        name: 'Gemini Pro+',
        description: '主力写作模型',
        context: '1m',
        routing: {
          haiku: 'gpt-5.4',
          sonnet: 'gemini-3.1-pro-preview',
          opus: 'gemini-3.1-pro-preview',
          smallFast: 'gpt-5.4',
        },
      },
      {
        id: 'gpt-5.4',
        name: 'GPT-5.4',
        description: '通用备用模型',
        context: '200k',
      },
    ],
  },
  null,
  2,
);

const modelRoutingExample = JSON.stringify(
  {
    haiku: 'gpt-5.4',
    sonnet: 'gemini-3.1-pro-preview',
    opus: 'gemini-3.1-pro-preview',
    smallFast: 'gpt-5.4',
  },
  null,
  2,
);

const formatJsonText = (value, emptyValue = '') => {
  const text = String(value || '').trim();
  if (!text) return emptyValue;
  return JSON.stringify(JSON.parse(text), null, 2);
};

const compactJsonText = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return JSON.stringify(JSON.parse(text));
};

export default function SettingDesktopModel(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState(defaultInputs);
  const [inputsRow, setInputsRow] = useState(defaultInputs);
  const refForm = useRef();

  const setFieldValue = (key, value) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    refForm.current?.setValue(key, value);
  };

  const validateJsonField = (key, label) => {
    const value = inputs[key];
    if (!value || String(value).trim() === '') return true;
    if (verifyJSON(value)) return true;
    showError(t(label) + t(' 不是合法 JSON'));
    return false;
  };

  function onSubmit() {
    if (!validateJsonField(KEY_MODELS_CONFIG, '完整模型配置')) return;
    if (!validateJsonField(KEY_MODEL_ROUTING, '默认模型路由')) return;

    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));

    const requestQueue = updateArray.map((item) => {
      let value = inputs[item.key] ?? '';
      if (item.key === KEY_MODELS_CONFIG || item.key === KEY_MODEL_ROUTING) {
        value = compactJsonText(value);
      }
      return API.put('/api/option/', {
        key: item.key,
        value: String(value),
      });
    });

    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined)) {
          return showError(t('部分保存失败，请重试'));
        }
        showSuccess(t('保存成功'));
        setInputsRow(structuredClone(inputs));
        props.refresh();
      })
      .catch(() => showError(t('保存失败，请重试')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const currentInputs = {};
    for (const key of Object.keys(defaultInputs)) {
      const raw = props.options?.[key] ?? defaultInputs[key];
      if (key === KEY_MODELS_CONFIG || key === KEY_MODEL_ROUTING) {
        try {
          currentInputs[key] = formatJsonText(raw);
        } catch (error) {
          currentInputs[key] = raw || '';
        }
      } else {
        currentInputs[key] = raw || '';
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current?.setValues(currentInputs);
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={t('桌面端模型配置')}>
          <Banner
            fullMode={false}
            type='info'
            description={t(
              '这些配置会通过 /api/status 下发给丸美小沐桌面端，用来远程控制可见模型、默认模型和内部路由。',
            )}
          />

          <Row style={{ marginTop: 12 }}>
            <Col span={24}>
              <Form.TextArea
                label={t('完整模型配置 JSON')}
                field={KEY_MODELS_CONFIG}
                placeholder={desktopModelsConfigExample}
                autosize={{ minRows: 10, maxRows: 24 }}
                rules={[
                  {
                    validator: (rule, value) => {
                      if (!value || value.trim() === '') return true;
                      return verifyJSON(value);
                    },
                    message: t('不是合法 JSON'),
                  },
                ]}
                extraText={t(
                  '推荐使用这个字段；可同时配置模型列表、展示名称、描述、上下文长度、默认模型和每个模型的路由。',
                )}
                onChange={(value) =>
                  setInputs({ ...inputs, [KEY_MODELS_CONFIG]: value })
                }
              />
              <Space style={{ marginBottom: 12 }}>
                <Button
                  size='small'
                  onClick={() =>
                    setFieldValue(
                      KEY_MODELS_CONFIG,
                      desktopModelsConfigExample,
                    )
                  }
                >
                  {t('填充示例')}
                </Button>
                <Button
                  size='small'
                  onClick={() => {
                    try {
                      setFieldValue(
                        KEY_MODELS_CONFIG,
                        formatJsonText(inputs[KEY_MODELS_CONFIG]),
                      );
                    } catch (error) {
                      showError(t('不是合法 JSON'));
                    }
                  }}
                >
                  {t('格式化 JSON')}
                </Button>
              </Space>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.TextArea
                label={t('可见模型白名单')}
                field={KEY_VISIBLE_MODELS}
                placeholder='gemini-3.1-pro-preview,gpt-5.4'
                autosize={{ minRows: 2, maxRows: 6 }}
                extraText={t('逗号分隔；留空表示桌面端显示全部后端可用模型。')}
                onChange={(value) =>
                  setInputs({ ...inputs, [KEY_VISIBLE_MODELS]: value })
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Form.TextArea
                label={t('模型展示顺序')}
                field={KEY_MODEL_ORDER}
                placeholder='gemini-3.1-pro-preview,gpt-5.4'
                autosize={{ minRows: 2, maxRows: 6 }}
                extraText={t('逗号分隔；只控制桌面端展示顺序，不影响后端渠道。')}
                onChange={(value) =>
                  setInputs({ ...inputs, [KEY_MODEL_ORDER]: value })
                }
              />
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Input
                label={t('默认模型')}
                field={KEY_DEFAULT_MODEL}
                placeholder='gemini-3.1-pro-preview'
                extraText={t('桌面端启动或远程配置刷新后优先选中的模型。')}
                onChange={(value) =>
                  setInputs({ ...inputs, [KEY_DEFAULT_MODEL]: value })
                }
              />
            </Col>
            <Col xs={24} md={12}>
              <Text type='tertiary' size='small'>
                {t(
                  '如果同时填写完整模型配置 JSON，桌面端会优先使用完整配置里的模型信息。',
                )}
              </Text>
            </Col>
          </Row>

          <Row>
            <Col span={24}>
              <Form.TextArea
                label={t('默认模型路由 JSON')}
                field={KEY_MODEL_ROUTING}
                placeholder={modelRoutingExample}
                autosize={{ minRows: 5, maxRows: 12 }}
                rules={[
                  {
                    validator: (rule, value) => {
                      if (!value || value.trim() === '') return true;
                      return verifyJSON(value);
                    },
                    message: t('不是合法 JSON'),
                  },
                ]}
                extraText={t(
                  '兼容旧字段：配置 haiku / sonnet / opus / smallFast 等内部别名要转发到哪个在线模型。',
                )}
                onChange={(value) =>
                  setInputs({ ...inputs, [KEY_MODEL_ROUTING]: value })
                }
              />
              <Space style={{ marginBottom: 12 }}>
                <Button
                  size='small'
                  onClick={() =>
                    setFieldValue(KEY_MODEL_ROUTING, modelRoutingExample)
                  }
                >
                  {t('填充示例')}
                </Button>
                <Button
                  size='small'
                  onClick={() => {
                    try {
                      setFieldValue(
                        KEY_MODEL_ROUTING,
                        formatJsonText(inputs[KEY_MODEL_ROUTING]),
                      );
                    } catch (error) {
                      showError(t('不是合法 JSON'));
                    }
                  }}
                >
                  {t('格式化 JSON')}
                </Button>
              </Space>
            </Col>
          </Row>

          <Row>
            <Button size='default' onClick={onSubmit}>
              {t('保存')}
            </Button>
          </Row>
        </Form.Section>
      </Form>
    </Spin>
  );
}
